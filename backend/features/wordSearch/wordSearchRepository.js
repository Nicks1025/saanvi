const QueryHelper = require('../../database/queryHelper');

class WordSearchRepository {
  constructor() {
    this.queryHelper = new QueryHelper();
  }

  async getRandomWords(difficulty, count) {
    const words = await this.queryHelper
      .from('words')
      .select('uuid, word, length, difficulty')
      // .where('difficulty', 'eq', difficulty) // we will fetch all and filter/randomize in service to avoid empty sets if difficulty has few words
      .execute();
      
    return words;
  }

  async createPuzzle(puzzleData) {
    const result = await this.queryHelper
      .from('word_search_puzzles')
      .insert(puzzleData)
      .execute();
    return puzzleData.uuid; // Assuming single insert, return the UUID we created
  }

  async createPuzzleWords(wordsData) {
    await this.queryHelper
      .from('word_search_puzzle_words')
      .insert(wordsData)
      .execute();
  }

  async getPuzzle(puzzleUuid) {
    const puzzles = await this.queryHelper
      .from('word_search_puzzles')
      .select('*')
      .where('uuid', 'eq', puzzleUuid)
      .execute();
    return puzzles && puzzles.length > 0 ? puzzles[0] : null;
  }

  async getPuzzleWords(puzzleUuid) {
    const words = await this.queryHelper
      .from('word_search_puzzle_words')
      .select('*, words (word, length)')
      .where('puzzle_uuid', 'eq', puzzleUuid)
      .execute();
    return words;
  }
}

module.exports = new WordSearchRepository();
