const wordSearchRepository = require('./wordSearchRepository');
const BaseService = require('../../base/baseService');

const DIRECTIONS = {
  HORIZONTAL: [0, 1],
  REVERSE_HORIZONTAL: [0, -1],
  VERTICAL: [1, 0],
  REVERSE_VERTICAL: [-1, 0],
  DIAGONAL_DOWN_RIGHT: [1, 1],
  DIAGONAL_UP_LEFT: [-1, -1],
  DIAGONAL_UP_RIGHT: [-1, 1],
  DIAGONAL_DOWN_LEFT: [1, -1]
};

const DIFFICULTY_CONFIG = {
  easy: {
    size: 8,
    wordCount: 5,
    directions: [DIRECTIONS.HORIZONTAL, DIRECTIONS.VERTICAL]
  },
  medium: {
    size: 10,
    wordCount: 8,
    directions: [
      DIRECTIONS.HORIZONTAL, DIRECTIONS.VERTICAL, 
      DIRECTIONS.DIAGONAL_DOWN_RIGHT, DIRECTIONS.DIAGONAL_UP_RIGHT
    ]
  },
  hard: {
    size: 12,
    wordCount: 10,
    directions: Object.values(DIRECTIONS)
  }
};

class WordSearchService extends BaseService {
  constructor(repository) {
    super(repository);
  }
  
  async startPuzzle(difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty];
    if (!config) throw new Error('Invalid difficulty');

    let allWords = await wordSearchRepository.getRandomWords(difficulty, config.wordCount);
    // If not enough words, fetch all and filter
    if (!allWords || allWords.length < config.wordCount) {
      allWords = await wordSearchRepository.getRandomWords('easy', 50); // Fallback
    }

    // Shuffle and pick
    const selectedWords = this._shuffleArray(allWords)
      .filter(w => w.length <= config.size)
      .slice(0, config.wordCount);

    if (selectedWords.length < config.wordCount) {
      throw new Error('Not enough valid words in the database to generate puzzle.');
    }

    // Try generating grid
    let puzzle = null;
    let attempts = 0;
    while (!puzzle && attempts < 10) {
      puzzle = this._generateGrid(config.size, selectedWords, config.directions);
      attempts++;
    }

    if (!puzzle) {
      throw new Error('Failed to generate a solvable puzzle.');
    }

    // Save to DB
    const puzzleData = {
      uuid: this.generateUuid(),
      difficulty,
      grid_size: config.size,
      grid_data: JSON.stringify(puzzle.grid),
      is_daily: false,
      game_date: null
    };

    await wordSearchRepository.createPuzzle(puzzleData);

    const puzzleWordsData = puzzle.placements.map((p, i) => ({
      uuid: this.generateUuid(),
      puzzle_uuid: puzzleData.uuid,
      word_uuid: p.word.uuid,
      start_row: p.startRow,
      start_column: p.startCol,
      end_row: p.endRow,
      end_column: p.endCol,
      direction: p.dirName,
      word_order: i
    }));

    await wordSearchRepository.createPuzzleWords(puzzleWordsData);

    // Return sanitized puzzle
    return {
      uuid: puzzleData.uuid,
      difficulty,
      gridSize: config.size,
      grid: puzzle.grid,
      words: selectedWords.map(w => ({ uuid: w.uuid, word: w.word }))
    };
  }

  async validateWord(puzzleUuid, start, end) {
    const puzzleWords = await wordSearchRepository.getPuzzleWords(puzzleUuid);
    if (!puzzleWords || puzzleWords.length === 0) {
      throw new Error('Puzzle not found or has no words');
    }

    // Check if any word matches the exact start/end coordinates or reverse (if user dragged backwards)
    for (const pw of puzzleWords) {
      const matchForward = (pw.start_row === start.row && pw.start_column === start.column && 
                            pw.end_row === end.row && pw.end_column === end.column);
      const matchReverse = (pw.start_row === end.row && pw.start_column === end.column && 
                            pw.end_row === start.row && pw.end_column === start.column);

      if (matchForward || matchReverse) {
        return {
          correct: true,
          word: pw.words.word,
          wordUuid: pw.word_uuid
        };
      }
    }

    return { correct: false };
  }

  async completeGame(puzzleUuid, foundWords, elapsedSeconds) {
    const puzzle = await wordSearchRepository.getPuzzle(puzzleUuid);
    if (!puzzle) throw new Error('Puzzle not found');

    const puzzleWords = await wordSearchRepository.getPuzzleWords(puzzleUuid);
    
    // Verify all words found
    if (foundWords.length !== puzzleWords.length) {
      throw new Error('Not all words found');
    }

    const requiredIds = puzzleWords.map(pw => pw.word_uuid).sort();
    const providedIds = [...foundWords].sort();

    for (let i = 0; i < requiredIds.length; i++) {
      if (requiredIds[i] !== providedIds[i]) {
        throw new Error('Invalid words submitted');
      }
    }

    // Calculate score
    const config = DIFFICULTY_CONFIG[puzzle.difficulty] || DIFFICULTY_CONFIG.easy;
    let baseScore = config.wordCount * 100;
    
    // Time penalty
    const expectedTime = config.wordCount * 15; // 15 seconds per word expected
    const timeDiff = elapsedSeconds - expectedTime;
    if (timeDiff > 0) {
      baseScore -= (timeDiff * 2); // lose 2 points per second over expected
    }

    const finalScore = Math.max(10, baseScore); // Minimum 10 points

    // Clean up puzzle to save DB space
    await wordSearchRepository.deletePuzzle(puzzleUuid);

    return {
      completed: true,
      score: finalScore,
      elapsedSeconds
    };
  }

  async abortGame(puzzleUuid) {
    if (!puzzleUuid) throw new Error('Puzzle UUID is required');
    await wordSearchRepository.deletePuzzle(puzzleUuid);
    return { success: true };
  }

  async getHint(puzzleUuid, wordUuid) {
    const puzzleWords = await wordSearchRepository.getPuzzleWords(puzzleUuid);
    const word = puzzleWords.find(pw => pw.word_uuid === wordUuid);
    
    if (!word) throw new Error('Word not found in puzzle');

    return {
      startRow: word.start_row,
      startColumn: word.start_column
    };
  }

  _generateGrid(size, words, allowedDirections) {
    const grid = Array(size).fill(null).map(() => Array(size).fill(''));
    const placements = [];

    // Sort longest to shortest for better packing
    const sortedWords = [...words].sort((a, b) => b.length - a.length);

    for (const wordObj of sortedWords) {
      const word = wordObj.word.toUpperCase();
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 200) {
        attempts++;
        const dir = allowedDirections[Math.floor(Math.random() * allowedDirections.length)];
        const dirName = Object.keys(DIRECTIONS).find(key => DIRECTIONS[key] === dir);
        
        const startRow = Math.floor(Math.random() * size);
        const startCol = Math.floor(Math.random() * size);

        const endRow = startRow + dir[0] * (word.length - 1);
        const endCol = startCol + dir[1] * (word.length - 1);

        if (endRow >= 0 && endRow < size && endCol >= 0 && endCol < size) {
          // Check overlap
          let canPlace = true;
          for (let i = 0; i < word.length; i++) {
            const r = startRow + dir[0] * i;
            const c = startCol + dir[1] * i;
            if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
              canPlace = false;
              break;
            }
          }

          if (canPlace) {
            for (let i = 0; i < word.length; i++) {
              grid[startRow + dir[0] * i][startCol + dir[1] * i] = word[i];
            }
            placements.push({
              word: wordObj,
              startRow,
              startCol,
              endRow,
              endCol,
              dirName
            });
            placed = true;
          }
        }
      }

      if (!placed) return null; // failed to place word
    }

    // Fill remaining
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === '') {
          grid[r][c] = letters.charAt(Math.floor(Math.random() * letters.length));
        }
      }
    }

    return { grid, placements };
  }

  _shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }
}

module.exports = new WordSearchService(wordSearchRepository);
