const BaseController = require('../../base/baseController');

class ObjectsController extends BaseController {
  constructor(objectsService) {
    super();
    this.objectsService = objectsService;
  }

  // --- Objects ---
  listObjects = async (req, res) => {
    const userUuid = req.user.uuid;
    const objects = await this.objectsService.listObjects(userUuid);
    this.sendSuccess(res, objects);
  };

  getObject = async (req, res) => {
    const { uuid } = req.params;
    const userUuid = req.user.uuid;
    const object = await this.objectsService.getObject(uuid, userUuid);
    this.sendSuccess(res, object);
  };

  createObject = async (req, res) => {
    const userUuid = req.user.uuid;
    const object = await this.objectsService.createObject(req.body, userUuid);
    this.sendSuccess(res, object, 'Object created successfully');
  };

  updateObject = async (req, res) => {
    const { uuid } = req.params;
    const userUuid = req.user.uuid;
    const object = await this.objectsService.updateObject(uuid, userUuid, req.body);
    this.sendSuccess(res, object, 'Object updated successfully');
  };

  deleteObject = async (req, res) => {
    const { uuid } = req.params;
    const userUuid = req.user.uuid;
    await this.objectsService.deleteObject(uuid, userUuid);
    this.sendSuccess(res, null, 'Object deleted successfully');
  };

  // --- Fields ---
  listFields = async (req, res) => {
    const { objectUuid } = req.params;
    const userUuid = req.user.uuid;
    const fields = await this.objectsService.listFields(objectUuid, userUuid);
    this.sendSuccess(res, fields);
  };

  createField = async (req, res) => {
    const { objectUuid } = req.params;
    const userUuid = req.user.uuid;
    const field = await this.objectsService.createField(objectUuid, userUuid, req.body);
    this.sendSuccess(res, field, 'Field created successfully');
  };

  updateField = async (req, res) => {
    const { objectUuid, fieldUuid } = req.params;
    const userUuid = req.user.uuid;
    const field = await this.objectsService.updateField(objectUuid, fieldUuid, userUuid, req.body);
    this.sendSuccess(res, field, 'Field updated successfully');
  };

  archiveField = async (req, res) => {
    const { objectUuid, fieldUuid } = req.params;
    const userUuid = req.user.uuid;
    await this.objectsService.archiveField(objectUuid, fieldUuid, userUuid);
    this.sendSuccess(res, null, 'Field archived successfully');
  };

  bulkSaveFields = async (req, res) => {
    const { objectUuid } = req.params;
    const { fields, deletedFieldIds } = req.body;
    const userUuid = req.user.uuid;
    await this.objectsService.bulkSaveFields(objectUuid, userUuid, fields, deletedFieldIds);
    this.sendSuccess(res, null, 'Fields updated successfully');
  };

  // --- Templates ---
  listTemplates = async (req, res) => {
    const { objectUuid } = req.params;
    const userUuid = req.user.uuid;
    const templates = await this.objectsService.listTemplates(objectUuid, userUuid);
    this.sendSuccess(res, templates);
  };

  createTemplate = async (req, res) => {
    const { objectUuid } = req.params;
    const userUuid = req.user.uuid;
    const template = await this.objectsService.createTemplate(objectUuid, userUuid, req.body);
    this.sendSuccess(res, template, 'Template created successfully');
  };

  updateTemplate = async (req, res) => {
    const { objectUuid, templateUuid } = req.params;
    const userUuid = req.user.uuid;
    const template = await this.objectsService.updateTemplate(templateUuid, objectUuid, userUuid, req.body);
    this.sendSuccess(res, template, 'Template updated successfully');
  };

  deleteTemplate = async (req, res) => {
    const { objectUuid, templateUuid } = req.params;
    const userUuid = req.user.uuid;
    await this.objectsService.deleteTemplate(templateUuid, objectUuid, userUuid);
    this.sendSuccess(res, null, 'Template deleted successfully');
  };

  // --- Records ---
  listRecords = async (req, res) => {
    const { objectUuid } = req.params;
    const userUuid = req.user.uuid;
    const data = await this.objectsService.listRecords(objectUuid, userUuid);
    this.sendSuccess(res, data);
  };

  createRecord = async (req, res) => {
    const { objectUuid } = req.params;
    const userUuid = req.user.uuid;
    const record = await this.objectsService.createRecord(objectUuid, userUuid, req.body);
    this.sendSuccess(res, record, 'Record created successfully');
  };

  updateRecord = async (req, res) => {
    const { objectUuid, recordUuid } = req.params;
    const userUuid = req.user.uuid;
    const record = await this.objectsService.updateRecord(objectUuid, recordUuid, userUuid, req.body);
    this.sendSuccess(res, record, 'Record updated successfully');
  };

  deleteRecord = async (req, res) => {
    const { objectUuid, recordUuid } = req.params;
    const userUuid = req.user.uuid;
    await this.objectsService.deleteRecord(objectUuid, recordUuid, userUuid);
    this.sendSuccess(res, null, 'Record deleted successfully');
  };
}

module.exports = ObjectsController;
