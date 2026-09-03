const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const SignupRepository = require('./signupRepository');
const SignupService = require('./signupService');
const SignupController = require('./signupController');

const repository = new SignupRepository();
const service = new SignupService(repository);
const controller = new SignupController(service);

const signup = {
  path: '/',
  verb: 'POST',
  auditMessage: 'user signup',
  handler: {
    controller: controller,
    method: 'signup'
  },
  request: {
    body: Joi.object({
      email: Joi.string().email().required(),
      first_name: Joi.string().max(100).required(),
      last_name: Joi.string().max(100).required(),
      display_name: Joi.string().max(200).required(),
      phone_number: Joi.string().required(),
      date_of_birth: Joi.string().required(),
      gender: Joi.string().required(),
      language: Joi.string().optional().default('en')
    }).unknown(true),
    stripUnknown: false
  }
};

const SignupApi = {
  name: 'Signup',
  url: '/api/signup',
  endpoints: [signup]
};

module.exports = new ApiSchema(SignupApi);
