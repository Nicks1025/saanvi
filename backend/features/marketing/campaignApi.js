const Joi = require('joi');
const ApiSchema = require('../../base/apiSchema');
const QueryHelper = require('../../database/queryHelper');
const CampaignRepository = require('./campaignRepository');
const CampaignService = require('./campaignService');
const CampaignController = require('./campaignController');

const queryHelper = new QueryHelper();
const repository = new CampaignRepository(queryHelper);
const service = new CampaignService(repository);
const controller = new CampaignController(service);

const getAllCampaigns = {
  path: '/',
  verb: 'GET',
  auditMessage: 'getting all campaigns',
  handler: { controller, method: 'getAllCampaigns' },
  middleware: { requirePermission: ['admin.email.campaign.get'] }
};

const getCampaign = {
  path: '/:uuid',
  verb: 'GET',
  auditMessage: 'getting campaign by uuid',
  handler: { controller, method: 'getCampaign' },
  middleware: { requirePermission: ['admin.email.campaign.get'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const createCampaign = {
  path: '/',
  verb: 'POST',
  auditMessage: 'creating campaign',
  handler: { controller, method: 'createCampaign' },
  middleware: { requirePermission: ['admin.email.campaign.create'] },
  request: {
    body: Joi.object({
      name: Joi.string().required(),
      subject: Joi.string().required(),
      template_key: Joi.string().allow(null).optional(),
      html_body: Joi.string().allow(null).optional(),
      scheduled_at: Joi.string().isoDate().allow(null).optional()
    })
  }
};

const sendCampaign = {
  path: '/:uuid/send',
  verb: 'POST',
  auditMessage: 'sending campaign',
  handler: { controller, method: 'sendCampaign' },
  middleware: { requirePermission: ['admin.email.campaign.send'] },
  request: {
    params: Joi.object({
      uuid: Joi.string().uuid().required()
    })
  }
};

const unsubscribe = {
  path: '/unsubscribe',
  verb: 'GET',
  auditMessage: 'unsubscribing from marketing emails',
  handler: { controller, method: 'unsubscribe' },
  // No permission required, this is a public endpoint used via email links
  request: {
    query: Joi.object({
      email: Joi.string().email().required(),
      token: Joi.string().required()
    })
  }
};

const CampaignApi = {
  name: 'Marketing Campaign',
  url: '/api/marketing/campaigns',
  endpoints: [
    getAllCampaigns,
    getCampaign,
    createCampaign,
    sendCampaign,
    unsubscribe
  ]
};

module.exports = new ApiSchema(CampaignApi);
