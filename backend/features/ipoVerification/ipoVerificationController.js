const BaseController = require('../../base/baseController');

class IpoVerificationController extends BaseController {
  constructor(service) {
    super();
    this.service = service;
  }

  async runDiscoveryAll(req, res) {
    try {
      // Typically protected by admin/system role
      const results = await this.service.runDiscoveryAll();
      return this.sendSuccess(res, results, 'Discovery completed for all sources');
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  async getIposWithCapabilities(req, res) {
    try {
      const results = await this.service.getIposWithCapabilities();
      return this.sendSuccess(res, results, 'Fetched IPOs with capabilities');
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  async runDiscovery(req, res) {
    try {
      const sourceId = req.params.sourceId;
      if (!sourceId) throw new Error('sourceId is required');

      const result = await this.service.runDiscovery(sourceId);
      return this.sendSuccess(res, result, 'Discovery completed for source');
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  async verifyApplicant(req, res) {
    try {
      this.validateRequiredParams(req.body, ['ipoId', 'sourceId', 'methodId', 'applicantId', 'identifiers']);
      const { ipoId, sourceId, methodId, applicantId, identifiers, session } = req.body;
      const userId = req.user ? req.user.uuid : null;

      if (!userId) {
        return this.sendError(res, new Error('User context missing'), 401);
      }

      const result = await this.service.verifyApplicant(userId, ipoId, sourceId, methodId, applicantId, identifiers, session);
      return this.sendSuccess(res, result, 'Verification completed');
    } catch (error) {
      // Rely on BaseController.sendError for standardized logging and sanitization
      return this.sendError(res, error);
    }
  }

  async getApplicants(req, res) {
    try {
      const userId = req.user ? req.user.uuid : null;
      if (!userId) {
        return this.sendError(res, new Error('User context missing'), 401);
      }
      const applicants = await this.service.getApplicants(userId);
      return this.sendSuccess(res, applicants, 'Fetched applicants');
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  async upsertApplicant(req, res) {
    try {
      this.validateRequiredParams(req.body, ['name', 'identifiers']);
      const userId = req.user ? req.user.uuid : null;
      if (!userId) {
        return this.sendError(res, new Error('User context missing'), 401);
      }
      const applicant = await this.service.upsertApplicant(userId, req.body);
      return this.sendSuccess(res, applicant, 'Applicant saved successfully');
    } catch (error) {
      return this.sendError(res, error);
    }
  }

  async verifyBatch(req, res) {
    try {
      this.validateRequiredParams(req.body, ['ipoId', 'selections']);
      const userId = req.user ? req.user.uuid : null;
      if (!userId) {
        return this.sendError(res, new Error('User context missing'), 401);
      }
      const { ipoId, selections, session } = req.body;
      const results = await this.service.verifyBatch(userId, ipoId, selections, session);
      return this.sendSuccess(res, results, 'Batch verification completed');
    } catch (error) {
      return this.sendError(res, error);
    }
  }
}

module.exports = IpoVerificationController;
