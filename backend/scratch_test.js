require('dotenv').config();
const wordSearchService = require('./features/wordSearch/wordSearchService');
async function test() {
  try {
    const puzzle = await wordSearchService.startPuzzle('easy');
    console.log("Success:", puzzle);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
