const BaseController = require('../../base/baseController');
const CampaignService = require('./campaignService');

class CampaignController extends BaseController {
  constructor(context = null) {
    super(context);
    this.service = new CampaignService(context);
  }

  async getAllCampaigns(req, res, next) {
    try {
      const query = (req && req.query) || (this.context && this.context.request && this.context.request.query) || {};
      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 20;
      const campaigns = await this.service.getAllCampaigns(page, limit);
      return this.respondOk(campaigns);
    } catch (err) {
      return this.respondError(err);
    }
  }

  async getCampaign(req, res, next) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const campaign = await this.service.getCampaign(params.uuid);
      return this.respondOk(campaign);
    } catch (err) {
      return this.respondError(err);
    }
  }

  async createCampaign(req, res, next) {
    try {
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const result = await this.service.createCampaign(body, user.uuid);
      return this.respondOk(result, 'Campaign created successfully', 201);
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  async updateCampaign(req, res, next) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const user = (req && req.user) || (this.context && this.context.user) || {};
      const result = await this.service.updateCampaign(params.uuid, body, user.uuid);
      return this.respondOk(result, 'Campaign updated successfully');
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  async deleteCampaign(req, res, next) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const result = await this.service.deleteCampaign(params.uuid);
      return this.respondOk(null, result.message);
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  async sendCampaign(req, res, next) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const result = await this.service.sendCampaign(params.uuid);
      return this.respondOk(null, result.message);
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  async handleUnsubscribe(req, res, next) {
    try {
      const query = (req && req.query) || (this.context && this.context.request && this.context.request.query) || {};
      const { email, token } = query;
      const result = await this.service.handleUnsubscribe(email, token);
      return this.respondOk(null, result.message);
    } catch (err) {
      return this.respondError(err, 400);
    }
  }

  async unsubscribe(req, res, next) {
    return this.handleUnsubscribe(req, res, next);
  }
}

module.exports = CampaignController;
