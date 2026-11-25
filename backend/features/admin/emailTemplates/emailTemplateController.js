const BaseController = require('../../../base/baseController');
const EmailTemplateService = require('./emailTemplateService');

class EmailTemplateController extends BaseController {
  constructor(context = null) {
    super(context);
    this.service = new EmailTemplateService(context);
  }

  async getAllTemplates(req, res) {
    const templates = await this.service.getAllTemplates();
    return this.respondOk(templates);
  }

  async getTemplate(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const template = await this.service.getTemplate(params.uuid);
    return this.respondOk(template);
  }

  async createTemplate(req, res) {
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const template = await this.service.createTemplate(body, user.uuid);
    return this.respondOk(template, 'Template created successfully', 201);
  }

  async updateTemplate(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const template = await this.service.updateTemplate(params.uuid, body, user.uuid);
    return this.respondOk(template);
  }

  async previewTemplate(req, res) {
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const preview = await this.service.previewTemplate(body);
    return this.respondOk(preview);
  }

  async testTemplate(req, res) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
      const result = await this.service.testTemplate(params.uuid, body);
      return this.respondOk(result);
    } catch (err) {
      return this.respondError(err.message, 400);
    }
  }

  async getEmailLogs(req, res) {
    const query = (req && req.query) || (this.context && this.context.request && this.context.request.query) || {};
    const { page = 1, limit = 10, search = '' } = query;
    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, parseInt(limit, 10) || 10);
    const result = await this.service.getEmailLogs(pageNumber, pageSize, search);
    return this.respondPaginated(result.data, {
      pageNumber: result.page,
      pageSize: result.limit,
      totalRecords: result.total
    }, null, res);
  }

  async deleteTemplate(req, res) {
    try {
      const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
      await this.service.deleteTemplate(params.uuid);
      return this.respondOk({ message: 'Template deleted successfully.' });
    } catch (err) {
      return this.respondError(err.message, 400);
    }
  }

  async getTableColumns(req, res) {
    try {
      const query = (req && req.query) || (this.context && this.context.request && this.context.request.query) || {};
      const { table } = query;
      if (!table) return this.respondError('table query parameter is required.', 400);
      const columns = await this.service.getTableColumns(table);
      return this.respondOk(columns);
    } catch (err) {
      return this.respondError(err.message, err.statusCode || 400);
    }
  }
}

module.exports = EmailTemplateController;
