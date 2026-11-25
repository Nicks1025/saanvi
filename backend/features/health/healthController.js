const BaseController = require('../../base/baseController');
const HealthService = require('./healthService');

class HealthController extends BaseController {
  constructor(context = null) {
    super(context);
    this.healthService = new HealthService(context);
  }

  async getSystemHealth(req, res) {
    try {
      const healthData = await this.healthService.getSystemHealth();
      return this.respondOk(healthData, 'System health retrieved successfully');
    } catch (error) {
      return this.respondError(error.message, 500);
    }
  }
}

module.exports = HealthController;
