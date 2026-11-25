const BaseController = require('../../base/baseController');
const ObjectsService = require('./objectsService');

class ObjectsController extends BaseController {
  constructor(context = null) {
    super(context);
    this.objectsService = new ObjectsService(context);
  }

  // --- Objects ---
  async listObjects(req, res) {
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const objects = await this.objectsService.listObjects(user.uuid);
    return this.respondOk(objects);
  }

  async getObject(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const object = await this.objectsService.getObject(params.uuid, user.uuid);
    return this.respondOk(object);
  }

  async createObject(req, res) {
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const object = await this.objectsService.createObject(body, user.uuid);
    return this.respondOk(object, 'Object created successfully', 201);
  }

  async updateObject(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const object = await this.objectsService.updateObject(params.uuid, user.uuid, body);
    return this.respondOk(object, 'Object updated successfully');
  }

  async deleteObject(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    await this.objectsService.deleteObject(params.uuid, user.uuid);
    return this.respondOk(null, 'Object deleted successfully');
  }

  // --- Fields ---
  async listFields(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const fields = await this.objectsService.listFields(params.objectUuid, user.uuid);
    return this.respondOk(fields);
  }

  async createField(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const field = await this.objectsService.createField(params.objectUuid, user.uuid, body);
    return this.respondOk(field, 'Field created successfully', 201);
  }

  async updateField(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const field = await this.objectsService.updateField(params.objectUuid, params.fieldUuid, user.uuid, body);
    return this.respondOk(field, 'Field updated successfully');
  }

  async archiveField(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    await this.objectsService.archiveField(params.objectUuid, params.fieldUuid, user.uuid);
    return this.respondOk(null, 'Field archived successfully');
  }

  async bulkSaveFields(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const { fields, deletedFieldIds } = body;
    await this.objectsService.bulkSaveFields(params.objectUuid, user.uuid, fields, deletedFieldIds);
    return this.respondOk(null, 'Fields updated successfully');
  }

  // --- Templates ---
  async listTemplates(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const templates = await this.objectsService.listTemplates(params.objectUuid, user.uuid);
    return this.respondOk(templates);
  }

  async createTemplate(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const template = await this.objectsService.createTemplate(params.objectUuid, user.uuid, body);
    return this.respondOk(template, 'Template created successfully', 201);
  }

  async updateTemplate(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const template = await this.objectsService.updateTemplate(params.templateUuid, params.objectUuid, user.uuid, body);
    return this.respondOk(template, 'Template updated successfully');
  }

  async deleteTemplate(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    await this.objectsService.deleteTemplate(params.templateUuid, params.objectUuid, user.uuid);
    return this.respondOk(null, 'Template deleted successfully');
  }

  // --- Records ---
  async getRecordCount(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const count = await this.objectsService.getRecordCount(params.objectUuid, user.uuid);
    return this.respondOk({ count });
  }

  async listRecords(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const data = await this.objectsService.listRecords(params.objectUuid, user.uuid);
    return this.respondOk(data);
  }

  async getRecord(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const record = await this.objectsService.getRecord(params.objectUuid, params.recordUuid, user.uuid);
    if (!record) {
      return this.respondError('Record not found', 404);
    }
    return this.respondOk(record);
  }

  async createRecord(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const record = await this.objectsService.createRecord(params.objectUuid, user.uuid, body);
    return this.respondOk(record, 'Record created successfully', 201);
  }

  async updateRecord(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const body = (req && req.body) || (this.context && this.context.request && this.context.request.body) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    const record = await this.objectsService.updateRecord(params.objectUuid, params.recordUuid, user.uuid, body);
    return this.respondOk(record, 'Record updated successfully');
  }

  async deleteRecord(req, res) {
    const params = (req && req.params) || (this.context && this.context.request && this.context.request.params) || {};
    const user = (req && req.user) || (this.context && this.context.user) || {};
    await this.objectsService.deleteRecord(params.objectUuid, params.recordUuid, user.uuid);
    return this.respondOk(null, 'Record deleted successfully');
  }
}

module.exports = ObjectsController;
