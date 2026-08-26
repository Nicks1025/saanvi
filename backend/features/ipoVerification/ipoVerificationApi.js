const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const IpoVerificationRepository = require('./ipoVerificationRepository');
const IpoVerificationService = require('./ipoVerificationService');
const IpoVerificationController = require('./ipoVerificationController');

const repository = new IpoVerificationRepository();
const service = new IpoVerificationService(repository);
const controller = new IpoVerificationController(service);

const runDiscoveryAll = {
  path: '/discovery/all',
  verb: 'POST',
  auditMessage: 'triggered IPO verification capability discovery for all sources',
  handler: {
    controller,
    method: 'runDiscoveryAll'
  },
  middleware: {
    requirePermission: ['ipo.verification.admin']
  }
};

const getIposWithCapabilities = {
  path: '/capabilities',
  verb: 'GET',
  auditMessage: 'fetched active IPOs and capabilities',
  handler: {
    controller,
    method: 'getIposWithCapabilities'
  },
  middleware: {
    requirePermission: ['ipo.verification.access']
  }
};

const runDiscovery = {
  path: '/discovery/:sourceId',
  verb: 'POST',
  auditMessage: 'triggered IPO verification capability discovery for a source',
  handler: {
    controller,
    method: 'runDiscovery'
  },
  middleware: {
    requirePermission: ['ipo.verification.admin']
  },
  request: {
    params: Joi.object({
      sourceId: Joi.string().uuid().required()
    })
  }
};

const verifyApplicant = {
  path: '/verify',
  verb: 'POST',
  auditMessage: 'verified IPO applicant allotment',
  handler: {
    controller,
    method: 'verifyApplicant'
  },
  middleware: {
    requirePermission: ['ipo.verification.execute']
  },
  request: {
    body: Joi.object({
      ipoId: Joi.string().uuid().required(),
      sourceId: Joi.string().uuid().required(),
      methodId: Joi.string().uuid().required(),
      applicantId: Joi.string().uuid().required(),
      identifiers: Joi.object().pattern(
        Joi.string().max(100), 
        Joi.alternatives().try(Joi.string().max(255), Joi.number())
      ).required(),
      session: Joi.object().optional().allow(null)
    })
  }
};

const getApplicants = {
  path: '/applicants',
  verb: 'GET',
  auditMessage: 'fetched IPO applicants',
  handler: {
    controller,
    method: 'getApplicants'
  },
  middleware: {
    requirePermission: ['ipo.verification.access']
  }
};

const upsertApplicant = {
  path: '/applicants',
  verb: 'POST',
  auditMessage: 'upserted IPO applicant',
  handler: {
    controller,
    method: 'upsertApplicant'
  },
  middleware: {
    requirePermission: ['ipo.verification.access']
  },
  request: {
    body: Joi.object({
      id: Joi.string().uuid().optional(),
      name: Joi.string().max(255).required(),
      identifiers: Joi.object().pattern(
        Joi.string().max(100),
        Joi.alternatives().try(
          Joi.string().max(255),
          Joi.number(),
          Joi.array().items(Joi.alternatives().try(Joi.string().max(255), Joi.number()))
        )
      ).required()
    })
  }
};

const verifyBatch = {
  path: '/verify/batch',
  verb: 'POST',
  auditMessage: 'verified multiple IPO applicant allotments in batch',
  handler: {
    controller,
    method: 'verifyBatch'
  },
  middleware: {
    requirePermission: ['ipo.verification.execute']
  },
  request: {
    body: Joi.object({
      ipoId: Joi.string().uuid().required(),
      selections: Joi.array().items(Joi.object({
        applicantId: Joi.string().uuid().required(),
        type: Joi.string().max(100).required(),
        value: Joi.alternatives().try(Joi.string().max(255), Joi.number()).required()
      })).min(1).required(),
      session: Joi.object().optional().allow(null)
    })
  }
};

const IpoVerificationApi = {
  name: 'IPO Verification',
  url: '/api/ipo-verification',
  endpoints: [
    runDiscoveryAll,
    runDiscovery,
    verifyApplicant,
    getIposWithCapabilities,
    getApplicants,
    upsertApplicant,
    verifyBatch
  ]
};

module.exports = new ApiSchema(IpoVerificationApi);
