require('dotenv').config();
const fs = require('fs');
const QueryHelper = require('./database/queryHelper');

async function run() {
  const qh = new QueryHelper();
  try {
    const sql = fs.readFileSync('./database/refresh_tokens_migration.sql', 'utf8');
    console.log('Running migration...');
    await qh.queryRaw(sql);
    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    qh.db.destroy();
  }
}

run();
