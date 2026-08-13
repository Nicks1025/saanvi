const QueryHelper = require('../../database/queryHelper');
const BaseRepository = require('../../base/baseRepository');

class WordSearchRepository extends BaseRepository {

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
      .from('word_search_puzzle_words', 'pw')
      .join('words', 'w', 'pw.word_uuid = w.uuid')
      .select('pw.*')
      .field('w.word')
      .field('w.length')
      .where('pw.puzzle_uuid', 'eq', puzzleUuid)
      .execute();
      
    // Format to match old nested format if necessary, or service can just use flat rows.
    // The previous service expected `words` as an object: p.words.word, p.words.length
    return words.map(row => ({
      ...row,
      words: {
        word: row.word,
        length: row.length
      }
    }));
  }

  async deletePuzzle(puzzleUuid) {
    await this.queryHelper
      .from('word_search_puzzle_words')
      .where('puzzle_uuid', 'eq', puzzleUuid)
      .delete()
      .execute();
      
    await this.queryHelper
      .from('word_search_puzzles')
      .where('uuid', 'eq', puzzleUuid)
      .delete()
      .execute();
  }
}

module.exports = new WordSearchRepository();
