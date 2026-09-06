const knex = require('knex');
require('dotenv').config();
const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });

async function migrate() {
  try {
    console.log('Starting migration...');
    await db.transaction(async (trx) => {
      // 1. Get all FK constraints pointing to public.users
      const constraints = await trx.raw(`
        SELECT conrelid::regclass::text AS table_name,
               conname AS constraint_name,
               pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE confrelid = 'users'::regclass AND contype = 'f'
      `);

      console.log(`Found ${constraints.rows.length} constraints.`);

      // 2. Drop all these constraints and recreate them with ON DELETE CASCADE ON UPDATE CASCADE
      for (const row of constraints.rows) {
        console.log(`Updating constraint ${row.constraint_name} on ${row.table_name}...`);
        
        let baseDef = row.def;
        baseDef = baseDef.replace(/ ON DELETE CASCADE/ig, '');
        baseDef = baseDef.replace(/ ON DELETE RESTRICT/ig, '');
        baseDef = baseDef.replace(/ ON UPDATE CASCADE/ig, '');
        baseDef = baseDef.replace(/ ON UPDATE RESTRICT/ig, '');

        await trx.raw(`ALTER TABLE ${row.table_name} DROP CONSTRAINT ${row.constraint_name};`);
        await trx.raw(`ALTER TABLE ${row.table_name} ADD CONSTRAINT ${row.constraint_name} ${baseDef} ON DELETE CASCADE ON UPDATE CASCADE;`);
      }

      // 3. Map mismatched users by email
      console.log('Mapping mismatched users...');
      await trx.raw(`
        CREATE TEMP TABLE user_uuid_map AS
        SELECT u.uuid as old_uuid, a.id as new_uuid
        FROM public.users u
        JOIN auth.users a ON u.email = a.email
        WHERE u.uuid != a.id;
      `);

      // 4. Update users table. Because of ON UPDATE CASCADE, all child tables will automatically update!
      console.log('Applying updates to public.users (will cascade to child tables)...');
      await trx.raw(`UPDATE public.users u SET uuid = m.new_uuid FROM user_uuid_map m WHERE u.uuid = m.old_uuid;`);

      // 5. Delete true orphans (users with no auth.users record at all)
      console.log('Deleting true orphans...');
      await trx.raw(`DELETE FROM public.users WHERE uuid NOT IN (SELECT id FROM auth.users);`);

      // 6. Add the master constraint linking public.users to auth.users
      console.log('Adding parent constraint to auth.users...');
      await trx.raw(`ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_auth;`);
      await trx.raw(`ALTER TABLE public.users ADD CONSTRAINT fk_users_auth FOREIGN KEY (uuid) REFERENCES auth.users(id) ON DELETE CASCADE;`);
    });
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
