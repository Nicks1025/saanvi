const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const LoginController = require('./loginController');

const login = {
  path: '/',
  verb: 'POST',
  auditMessage: 'user login',
  handler: {
    controller: LoginController,
    method: 'login'
  },
  request: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  }
};

const googleLogin = {
  path: '/google',
  verb: 'POST',
  auditMessage: 'user google login',
  handler: {
    controller: LoginController,
    method: 'googleLogin'
  },
  request: {
    body: Joi.object({
      accessToken: Joi.string().required()
    })
  }
};

const mfaVerifyApi = {
  path: '/mfa-verify',
  verb: 'POST',
  auditMessage: 'user mfa verification',
  handler: {
    controller: LoginController,
    method: 'mfaVerify'
  },
  request: {
    body: Joi.object({
      email: Joi.string().email().required(),
      code: Joi.string().length(6).required(),
      mfaTicket: Joi.string().required()
    })
  }
};

const refreshTokenApi = {
  path: '/refresh-token',
  verb: 'POST',
  auditMessage: 'refresh access token',
  handler: {
    controller: LoginController,
    method: 'refreshToken'
  }
};

const logoutApi = {
  path: '/logout',
  verb: 'POST',
  auditMessage: 'user logout',
  handler: {
    controller: LoginController,
    method: 'logout'
  }
};

const LoginApi = {
  name: 'Login',
  url: '/api/login',
  endpoints: [
    login,
    googleLogin,
    mfaVerifyApi,
    refreshTokenApi,
    logoutApi
  ]
};

module.exports = new ApiSchema(LoginApi);
