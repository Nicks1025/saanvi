const BaseController = require('../../../base/baseController');
const DynamicVariablesService = require('./dynamicVariablesService');

class DynamicVariablesController extends BaseController {
  constructor(context = null) {
    super(context);
    this.service = new DynamicVariablesService(context);
  }

  async getAll(req, res) {
    const data = await this.service.getAll();
    return this.respondOk(data, 'Dynamic variables retrieved successfully');
  }

  async create(req, res) {
    const userUuid = this.context?.user?.uuid || req?.user?.uuid;
    const body = req?.body || this.context?.request?.body || {};
    const data = await this.service.create(body, userUuid);
    return this.respondOk(data, 'Dynamic variable created successfully');
  }

  async update(req, res) {
    const uuid = req?.params?.uuid || this.context?.request?.params?.uuid;
    const body = req?.body || this.context?.request?.body || {};
    const userUuid = this.context?.user?.uuid || req?.user?.uuid;
    await this.service.update(uuid, body, userUuid);
    return this.respondOk(null, 'Dynamic variable updated successfully');
  }

  async delete(req, res) {
    const uuid = req?.params?.uuid || this.context?.request?.params?.uuid;
    await this.service.delete(uuid);
    return this.respondOk(null, 'Dynamic variable deleted successfully');
  }
}

module.exports = DynamicVariablesController;
