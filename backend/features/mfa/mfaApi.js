const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const MfaController = require('./mfaController');

const getStatus = {
  path: '/status',
  verb: 'GET',
  auditMessage: 'fetching mfa status',
  handler: {
    controller: MfaController,
    method: 'getStatus'
  },
  middleware: {
    requireAuth: true
  }
};

const enroll = {
  path: '/enroll',
  verb: 'POST',
  auditMessage: 'initializing mfa enrollment',
  handler: {
    controller: MfaController,
    method: 'enroll'
  },
  middleware: {
    requireAuth: true
  }
};

const challenge = {
  path: '/challenge',
  verb: 'POST',
  auditMessage: 'creating mfa challenge',
  handler: {
    controller: MfaController,
    method: 'challenge'
  },
  middleware: {
    requireAuth: true
  },
  request: {
    body: Joi.object({
      factorId: Joi.string().required()
    })
  }
};

const verify = {
  path: '/verify',
  verb: 'POST',
  auditMessage: 'verifying mfa setup',
  handler: {
    controller: MfaController,
    method: 'verify'
  },
  middleware: {
    requireAuth: true
  },
  request: {
    body: Joi.object({
      factorId: Joi.string().required(),
      challengeId: Joi.string().allow('', null).optional(),
      code: Joi.string().length(6).required()
    })
  }
};

const unenroll = {
  path: '/unenroll',
  verb: 'POST',
  auditMessage: 'unenrolling mfa',
  handler: {
    controller: MfaController,
    method: 'unenroll'
  },
  middleware: {
    requireAuth: true
  },
  request: {
    body: Joi.object({
      factorId: Joi.string().required()
    })
  }
};

module.exports = new ApiSchema({
  name: 'Mfa',
  url: '/api/mfa',
  endpoints: [
    getStatus,
    enroll,
    challenge,
    verify,
    unenroll
  ]
});
