import axios from '../../../../services/axios.client';

export const wordSearchService = {
  startPuzzle: async (difficulty) => {
    const response = await axios.post('/api/games/word-search/start', { difficulty });
    return response.data;
  },

  validateWord: async (puzzleUuid, start, end) => {
    const response = await axios.post('/api/games/word-search/validate', { puzzleUuid, start, end });
    return response.data;
  },

  completeGame: async (puzzleUuid, foundWords, elapsedSeconds) => {
    const response = await axios.post('/api/games/word-search/complete', { puzzleUuid, foundWords, elapsedSeconds });
    return response.data;
  },

  getHint: async (puzzleUuid, wordUuid) => {
    const response = await axios.post('/api/games/word-search/hint', { puzzleUuid, wordUuid });
    return response.data;
  }
};
