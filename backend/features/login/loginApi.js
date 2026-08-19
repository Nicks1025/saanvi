const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const LoginRepository = require('./loginRepository');
const LoginService = require('./loginService');
const LoginController = require('./loginController');

const repository = new LoginRepository();
const service = new LoginService(repository);
const controller = new LoginController(service);

const login = {
  path: '/',
  verb: 'POST',
  auditMessage: 'user login',
  handler: {
    controller: controller,
    method: 'login'
  },
  // Login does not require verifyToken middleware, so we specifically omit requirePermission
  // However, ApiSchema currently injects verifyToken if requirePermission is absent OR present?
  // Wait, I need to make sure ApiSchema doesn't block unauthenticated routes if middleware is omitted.
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
    controller: controller,
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
    controller: controller,
    method: 'mfaVerify'
  },
  request: {
    body: Joi.object({
      email: Joi.string().email().required(),
      code: Joi.string().length(6).required(),
      supabaseToken: Joi.string().required()
    })
  }
};

const LoginApi = {
  name: 'Login',
  url: '/api/login',
  endpoints: [
    login,
    googleLogin,
    mfaVerifyApi
  ]
};

module.exports = new ApiSchema(LoginApi);
