const BaseController = require('../../../base/baseController');

class EmailTemplateController extends BaseController {
  constructor(service) {
    super();
    this.service = service;
  }

  async getAllTemplates(req, res) {
    const templates = await this.service.getAllTemplates();
    this.sendSuccess(res, templates);
  }

  async getTemplate(req, res) {
    const template = await this.service.getTemplate(req.params.uuid);
    this.sendSuccess(res, template);
  }

  async createTemplate(req, res) {
    const template = await this.service.createTemplate(req.body, req.user.uuid);
    this.sendSuccess(res, template, 201);
  }

  async updateTemplate(req, res) {
    const template = await this.service.updateTemplate(req.params.uuid, req.body, req.user.uuid);
    this.sendSuccess(res, template);
  }

  async previewTemplate(req, res) {
    const preview = await this.service.previewTemplate(req.body);
    this.sendSuccess(res, preview);
  }

  async testTemplate(req, res) {
    try {
      const result = await this.service.testTemplate(req.params.uuid, req.body);
      this.sendSuccess(res, result);
    } catch (err) {
      this.sendError(res, err.message, 400);
    }
  }

  async getEmailLogs(req, res) {
    const logs = await this.service.getEmailLogs();
    this.sendSuccess(res, logs);
  }

  async deleteTemplate(req, res) {
    try {
      await this.service.deleteTemplate(req.params.uuid);
      this.sendSuccess(res, { message: 'Template deleted successfully.' });
    } catch (err) {
      this.sendError(res, err.message, 400);
    }
  }

  async getTableColumns(req, res) {
    try {
      const { table } = req.query;
      if (!table) return this.sendError(res, 'table query parameter is required.', 400);
      const columns = await this.service.getTableColumns(table);
      this.sendSuccess(res, columns);
    } catch (err) {
      this.sendError(res, err.message, err.statusCode || 400);
    }
  }
}

module.exports = EmailTemplateController;
