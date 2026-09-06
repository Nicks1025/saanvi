require('dotenv').config();
const knex = require('knex');

const db = knex({ client: 'pg', connection: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Adding new permissions...');
    await db.raw(`
      INSERT INTO public.permissions (uuid, permission, name, description)
      VALUES 
        (gen_random_uuid(), 'admin.email.campaign.update', 'Update Campaigns', 'Allows updating email campaigns'),
        (gen_random_uuid(), 'admin.email.campaign.delete', 'Delete Campaigns', 'Allows deleting email campaigns'),
        (gen_random_uuid(), 'admin.email.campaign.send', 'Send Campaigns', 'Allows sending email campaigns'),
        (gen_random_uuid(), 'admin.email.campaign.create', 'Create Campaigns', 'Allows creating email campaigns')
      ON CONFLICT (permission) DO NOTHING;
    `);

    // Assign these new permissions to Super Admin role
    const superAdminRole = await db('roles').where('name', 'Super Admin').first();
    if (superAdminRole) {
      const permissions = await db('permissions').whereIn('permission', [
        'admin.email.campaign.update',
        'admin.email.campaign.delete',
        'admin.email.campaign.send',
        'admin.email.campaign.create'
      ]);

      for (const p of permissions) {
        await db.raw(`
          INSERT INTO public.role_permissions (uuid, role_uuid, permission_uuid)
          VALUES (gen_random_uuid(), ?, ?)
          ON CONFLICT ON CONSTRAINT unique_role_permission DO NOTHING;
        `, [superAdminRole.uuid, p.uuid]);
      }
    }

    console.log('Removing workflow permissions...');
    
    // First remove from role_permissions
    await db.raw(`
      DELETE FROM public.role_permissions
      WHERE permission_uuid IN (
        SELECT uuid FROM public.permissions WHERE permission LIKE '%workflow%'
      );
    `);
    
    // Then remove from permissions
    await db.raw(`
      DELETE FROM public.permissions 
      WHERE permission LIKE '%workflow%';
    `);

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.destroy();
  }
}

run();
