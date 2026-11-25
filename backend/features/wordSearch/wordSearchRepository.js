const QueryHelper = require('../../database/queryHelper');
const BaseRepository = require('../../base/baseRepository');

class WordSearchRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sqlWords = new QueryHelper('words');
    this.sqlPuzzles = new QueryHelper('word_search_puzzles');
    this.sqlPuzzleWords = new QueryHelper('word_search_puzzle_words');
  }

  async getRandomWords(difficulty, count) {
    const query = this.sqlWords
      .select()
      .field('uuid')
      .field('word')
      .field('length')
      .field('difficulty');
    return this.runQuery(query);
  }

  async createPuzzle(puzzleData) {
    const query = this.sqlPuzzles.insert(puzzleData);
    await this.execute(query);
    return puzzleData.uuid;
  }

  async createPuzzleWords(wordsData) {
    if (!wordsData || wordsData.length === 0) return;
    const query = this.sqlPuzzleWords.insert(wordsData);
    await this.execute(query);
  }

  async getPuzzle(puzzleUuid) {
    const query = this.sqlPuzzles
      .select()
      .field('*')
      .where('uuid', '=', puzzleUuid);
    return this.runQueryFirst(query);
  }

  async getPuzzleWords(puzzleUuid) {
    const query = this.sqlPuzzleWords
      .select()
      .field('word_search_puzzle_words.*')
      .field('words.word')
      .field('words.length')
      .join('words', 'word_search_puzzle_words.word_uuid', 'words.uuid')
      .where('word_search_puzzle_words.puzzle_uuid', '=', puzzleUuid);

    const rows = await this.runQuery(query);
    return rows.map(row => ({
      ...row,
      words: {
        word: row.word,
        length: row.length
      }
    }));
  }

  async deletePuzzle(puzzleUuid) {
    await this.execute(
      this.sqlPuzzleWords.delete().where('puzzle_uuid', '=', puzzleUuid)
    );
    await this.execute(
      this.sqlPuzzles.delete().where('uuid', '=', puzzleUuid)
    );
  }
}

module.exports = WordSearchRepository;
