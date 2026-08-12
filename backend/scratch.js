require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('word_search_puzzles').select('*').limit(1);
  console.log("word_search_puzzles:", error ? error.message : "Exists");
  
  const { data: wData, error: wError } = await supabase.from('words').select('*').limit(1);
  console.log("words:", wError ? wError.message : "Exists");
  
  const { data: pwData, error: pwError } = await supabase.from('word_search_puzzle_words').select('*').limit(1);
  console.log("word_search_puzzle_words:", pwError ? pwError.message : "Exists");
}
checkSchema();
