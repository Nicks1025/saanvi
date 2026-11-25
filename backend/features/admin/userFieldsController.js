const BaseController = require('../../base/baseController');
const UserFieldsService = require('./userFieldsService');

class UserFieldsController extends BaseController {
  constructor(context = null) {
    super(context);
    this.userFieldsService = new UserFieldsService(context);
  }

  async getAllFields() {
    const result = await this.userFieldsService.getAllFields();
    return this.respondOk(result, 'Fields retrieved successfully');
  }

  async createField(req) {
    const result = await this.userFieldsService.createField(req.body);
    return this.respondOk(result, 'Field created successfully');
  }

  async updateField(req) {
    const result = await this.userFieldsService.updateField(req.params.id, req.body);
    return this.respondOk(result, 'Field updated successfully');
  }

  async deleteField(req) {
    await this.userFieldsService.deleteField(req.params.id);
    return this.respondOk(null, 'Field deleted successfully');
  }

  async bulkSaveFields(req) {
    const result = await this.userFieldsService.bulkSaveFields(req.body.fields, req.body.deletedFieldIds);
    return this.respondOk(result, 'Fields updated successfully');
  }

  async getPublicFormConfig(req) {
    const context = req.query?.context || 'signup';
    const result = await this.userFieldsService.getPublicFormConfig(context);
    return this.respondOk(result, 'Form configuration retrieved successfully');
  }
}

module.exports = UserFieldsController;
