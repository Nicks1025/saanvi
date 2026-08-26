const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const IpoAllotmentController = require('./ipoAllotmentController');

const ipoAllotmentApiDef = {
  name: 'IPO Allotment',
  url: '/api/ipo-allotment',
  endpoints: [
    {
      verb: 'GET',
      path: '/ipos',
      handler: {
        controller: IpoAllotmentController,
        method: 'getIpos'
      },
      middleware: {
        requireAuth: true
      },
      request: {
        query: Joi.object({
          status: Joi.string().valid('open', 'closed', 'listed', 'upcoming').optional(),
          issueType: Joi.string().valid('regular', 'sme').optional(),
          page: Joi.number().integer().min(1).optional(),
          limit: Joi.number().integer().min(1).max(100).optional()
        })
      }
    },
    {
      verb: 'GET',
      path: '/applicants',
      handler: {
        controller: IpoAllotmentController,
        method: 'getApplicants'
      },
      middleware: {
        requirePermission: ['ipo.verification.access']
      }
    },
    {
      verb: 'POST',
      path: '/applicants',
      handler: {
        controller: IpoAllotmentController,
        method: 'upsertApplicant'
      },
      middleware: {
        requirePermission: ['ipo.verification.access']
      },
      request: {
        body: Joi.object({
          id: Joi.string().uuid().optional(),
          name: Joi.string().required(),
          identifiers: Joi.object({
            PAN: Joi.string().trim().uppercase().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/).required(),
            DPID: Joi.string().allow('').optional(),
            APPLICATION_NUMBER: Joi.string().allow('').optional()
          }).required()
        })
      }
    },
    {
      verb: 'POST',
      path: '/check',
      handler: {
        controller: IpoAllotmentController,
        method: 'checkAllotment'
      },
      middleware: {
        requirePermission: ['ipo.verification.execute']
      },
      request: {
        body: Joi.object({
          ipoId: Joi.string().required(),
          selections: Joi.array().items(Joi.object({
            applicantId: Joi.string().uuid().required(),
            type: Joi.string().valid('PAN', 'DPID', 'APPLICATION_NUMBER').required(),
            value: Joi.string().required()
          })).min(1).required()
        })
      }
    }
  ]
};

module.exports = new ApiSchema(ipoAllotmentApiDef);
