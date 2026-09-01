const QueryHelper = require('../../database/queryHelper');
const AdminRepository = require('./adminRepository');
const UserFieldsService = require('./userFieldsService');

const queryHelper = new QueryHelper();
const adminRepository = new AdminRepository(queryHelper);
const userFieldsService = new UserFieldsService(adminRepository);

const userFieldsController = {
  getAllFields: async (req, res) => {
    const result = await userFieldsService.getAllFields();
    res.json({ success: true, data: result });
  },
  createField: async (req, res) => {
    const result = await userFieldsService.createField(req.body);
    res.status(201).json({ success: true, data: result });
  },
  updateField: async (req, res) => {
    const result = await userFieldsService.updateField(req.params.id, req.body);
    res.json({ success: true, data: result });
  },
  deleteField: async (req, res) => {
    await userFieldsService.deleteField(req.params.id);
    res.status(200).json({ success: true, data: null });
  },
  bulkSaveFields: async (req, res) => {
    const result = await userFieldsService.bulkSaveFields(req.body.fields, req.body.deletedFieldIds);
    res.json({ success: true, data: result });
  },
  getPublicFormConfig: async (req, res) => {
    const context = req.query.context || 'signup';
    const result = await userFieldsService.getPublicFormConfig(context);
    res.json({ success: true, data: result });
  }
};

module.exports = userFieldsController;
