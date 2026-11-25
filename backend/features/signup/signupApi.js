const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const SignupController = require('./signupController');

const signup = {
  path: '/',
  verb: 'POST',
  auditMessage: 'user signup',
  handler: {
    controller: SignupController,
    method: 'signup'
  },
  request: {
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().max(100).required(),
      lastName: Joi.string().max(100).required(),
      displayName: Joi.string().max(200).required(),
      phoneNumber: Joi.string().optional().allow('', null),
      dateOfBirth: Joi.string().optional().allow('', null),
      gender: Joi.string().required(),
      language: Joi.string().optional().default('en')
    }).unknown(true),
    stripUnknown: false
  }
};

const resendVerification = {
  path: '/resend-verification',
  verb: 'POST',
  auditMessage: 'resend email verification',
  handler: {
    controller: SignupController,
    method: 'resendVerification'
  },
  request: {
    body: Joi.object({
      email: Joi.string().email().required()
    })
  }
};

const SignupApi = {
  name: 'Signup',
  url: '/api/signup',
  endpoints: [signup, resendVerification]
};

module.exports = new ApiSchema(SignupApi);
