const BaseController = require('../../base/baseController');

class CampaignController extends BaseController {
  constructor(campaignService) {
    super();
    this.service = campaignService;
  }

  async getAllCampaigns(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const campaigns = await this.service.getAllCampaigns(page, limit);
      res.status(200).json({ success: true, data: campaigns });
    } catch (err) {
      this.sendError(res, err);
    }
  }

  async getCampaign(req, res, next) {
    try {
      const campaign = await this.service.getCampaign(req.params.uuid);
      res.status(200).json({ success: true, data: campaign });
    } catch (err) {
      this.sendError(res, err);
    }
  }

  async createCampaign(req, res, next) {
    try {
      const result = await this.service.createCampaign(req.body, req.user.uuid);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      this.sendError(res, err, 400);
    }
  }

  async sendCampaign(req, res, next) {
    try {
      const result = await this.service.sendCampaign(req.params.uuid);
      res.status(200).json({ success: true, message: result.message });
    } catch (err) {
      this.sendError(res, err, 400);
    }
  }

  async unsubscribe(req, res, next) {
    try {
      const { email, token } = req.query;
      const result = await this.service.unsubscribe(email, token);
      res.status(200).json({ success: true, message: result.message });
    } catch (err) {
      this.sendError(res, err, 400);
    }
  }
}

module.exports = CampaignController;
