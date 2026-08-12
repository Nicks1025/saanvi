require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testRpc() {
  const sql = `
    SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
  `;
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  console.log("exec_sql:", error ? error.message : "Success");
  
  const { data: d2, error: e2 } = await supabase.rpc('execute_sql', { query: sql });
  console.log("execute_sql:", e2 ? e2.message : "Success");
}
testRpc();
