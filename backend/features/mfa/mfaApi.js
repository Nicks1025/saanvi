const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const BaseRepository = require('../../base/baseRepository');
const MfaService = require('./mfaService');
const MfaController = require('./mfaController');

const repository = new BaseRepository();
const service = new MfaService(repository);
const controller = new MfaController(service);

const getStatus = {
  path: '/status',
  verb: 'GET',
  auditMessage: 'fetching mfa status',
  handler: { controller, method: 'getStatus' },
  middleware: { requireAuth: true }
};

const enroll = {
  path: '/enroll',
  verb: 'POST',
  auditMessage: 'initializing mfa enrollment',
  handler: { controller, method: 'enroll' },
  middleware: { requireAuth: true },
  request: {
    body: Joi.object({
      supabaseToken: Joi.string().required()
    })
  }
};

const challenge = {
  path: '/challenge',
  verb: 'POST',
  auditMessage: 'creating mfa challenge',
  handler: { controller, method: 'challenge' },
  middleware: { requireAuth: true },
  request: {
    body: Joi.object({
      supabaseToken: Joi.string().required(),
      factorId: Joi.string().required()
    })
  }
};

const verify = {
  path: '/verify',
  verb: 'POST',
  auditMessage: 'verifying mfa setup',
  handler: { controller, method: 'verify' },
  middleware: { requireAuth: true },
  request: {
    body: Joi.object({
      supabaseToken: Joi.string().required(),
      factorId: Joi.string().required(),
      challengeId: Joi.string().required(),
      code: Joi.string().length(6).required()
    })
  }
};

const unenroll = {
  path: '/unenroll',
  verb: 'POST',
  auditMessage: 'unenrolling mfa',
  handler: { controller, method: 'unenroll' },
  middleware: { requireAuth: true },
  request: {
    body: Joi.object({
      supabaseToken: Joi.string().required(),
      factorId: Joi.string().required()
    })
  }
};

const MfaApi = {
  name: 'MFA',
  url: '/api/mfa',
  endpoints: [getStatus, enroll, challenge, verify, unenroll]
};

module.exports = new ApiSchema(MfaApi);
