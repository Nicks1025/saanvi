const { Client } = require('pg');

async function check() {
  const client = new Client({
    connectionString: 'postgresql://postgres.mwmcvvoreqylanemnicz:Nikhil%40318935@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`
    SELECT * FROM public.messages ORDER BY created_at DESC LIMIT 10;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check().catch(console.error);
