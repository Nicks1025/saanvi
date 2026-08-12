/**
 * General Utilities
 */

export const generateRequestId = () => {
  return 'req-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
};
