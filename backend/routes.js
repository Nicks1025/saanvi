const loginApi = require('./features/login/loginApi');
const signupApi = require('./features/signup/signupApi');
const userApi = require('./features/user/userApi');
const adminApi = require('./features/admin/adminApi');
const UserFieldsApi = require('./features/admin/userFieldsApi');
const wordSearchApi = require('./features/wordSearch/wordSearchApi');
const mfaApi = require('./features/mfa/mfaApi');
const healthApi = require('./features/health/healthApi');
const chatApi = require('./features/chat/chatApi');
const unoApi = require('./features/uno/unoApi');
const arrowPuzzleApi = require('./features/arrowPuzzle/arrowPuzzleApi');

/**
 * Automatically registers all API endpoints to the Express app.
 * @param {import('express').Application} app 
 */
module.exports = function(app) {
  const apis = [loginApi, signupApi, userApi, UserFieldsApi, adminApi, wordSearchApi, mfaApi, healthApi, chatApi, unoApi, arrowPuzzleApi];

  // Declarative ApiSchema Routes
  for (const api of apis) {
    if (api && typeof api.register === 'function') {
      api.register(app);
    }
  }
};
