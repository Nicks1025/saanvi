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
      email:        Joi.string().email().max(254).required(),
      password:     Joi.string().min(8).required(),
      firstName:    Joi.string().max(100).required(),
      lastName:     Joi.string().max(100).required(),
      displayName:  Joi.string().max(200).required(),
      phoneNumber:  Joi.string().max(30).required(),
      dateOfBirth:  Joi.string().isoDate().required(),
      gender:       Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say').required(),
      language:     Joi.string().max(20).allow('', null).optional()
    })
  }
};

const SignupApi = {
  name: 'Signup',
  url: '/api/signup',
  endpoints: [signup]
};

module.exports = new ApiSchema(SignupApi);
