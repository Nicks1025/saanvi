const BaseController = require('../../base/baseController');

class HealthController extends BaseController {
  constructor(healthService) {
    super(healthService);
    this.healthService = healthService;
  }

  async getSystemHealth(req, res) {
    try {
      const healthData = await this.healthService.getSystemHealth();
      
      // Determine HTTP status code based on overall health
      // We will always return 200 OK because it is an admin monitoring endpoint
      // and we want the frontend to successfully parse the JSON payload instead of crashing.
      return this.sendSuccess(res, healthData, 'System health retrieved successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }
}

module.exports = HealthController;
