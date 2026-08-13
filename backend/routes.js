const loginApi = require('./features/login/loginApi');
const userApi = require('./features/user/userApi');
const adminApi = require('./features/admin/adminApi');
const wordSearchApi = require('./features/wordSearch/wordSearchApi');
const mfaApi = require('./features/mfa/mfaApi');

/**
 * Automatically registers all API endpoints to the Express app.
 * @param {import('express').Application} app 
 */
module.exports = function(app) {
  const apis = [loginApi, userApi, adminApi, wordSearchApi, mfaApi];

  // Declarative ApiSchema Routes
  for (const api of apis) {
    if (api && typeof api.register === 'function') {
      api.register(app);
    }
  }
};
