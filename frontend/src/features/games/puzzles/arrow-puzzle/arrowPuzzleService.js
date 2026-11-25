import axiosClient from '@/services/axios.client.js';

export const getArrowPuzzleProgress = async () => {
  const response = await axiosClient.get('/api/games/arrow-puzzle/progress');
  return response?.data || response;
};

export const generateArrowPuzzle = async ({ shape, level, liteMode = false }) => {
  const params = new URLSearchParams();
  if (shape) params.append('shape', shape);
  if (level) params.append('level', level);
  if (liteMode) params.append('liteMode', 'true');
  const response = await axiosClient.get(`/api/games/arrow-puzzle/generate?${params.toString()}`);
  return response?.data || response;
};

export const saveArrowPuzzleProgress = async ({ shape, level, timeTaken }) => {
  const response = await axiosClient.post('/api/games/arrow-puzzle/progress', {
    shape,
    level,
    timeTaken
  });
  return response?.data || response;
};
