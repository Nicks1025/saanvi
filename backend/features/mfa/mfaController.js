const BaseController = require('../../base/baseController');

class MfaController extends BaseController {
  constructor(mfaService) {
    super();
    this.mfaService = mfaService;
  }

  async getStatus(req, res) {
    try {
      const result = await this.mfaService.getStatus(req.user.uuid);
      return this.sendSuccess(res, result, 'MFA status fetched successfully');
    } catch (error) {
      return this.sendError(res, error.message, 500);
    }
  }

  async enroll(req, res) {
    try {
      this.validateRequiredParams(req.body, ['supabaseToken']);
      const result = await this.mfaService.enroll(req.body.supabaseToken, req.user.email);
      return this.sendSuccess(res, result, 'MFA enrollment initialized');
    } catch (error) {
      return this.sendError(res, error.message, 400);
    }
  }

  async challenge(req, res) {
    try {
      this.validateRequiredParams(req.body, ['supabaseToken', 'factorId']);
      const result = await this.mfaService.challenge(req.body.supabaseToken, req.body.factorId);
      return this.sendSuccess(res, result, 'MFA challenge created');
    } catch (error) {
      return this.sendError(res, error.message, 400);
    }
  }

  async verify(req, res) {
    try {
      this.validateRequiredParams(req.body, ['supabaseToken', 'factorId', 'challengeId', 'code']);
      const { supabaseToken, factorId, challengeId, code } = req.body;
      const result = await this.mfaService.verify(req.user.uuid, supabaseToken, factorId, challengeId, code);
      return this.sendSuccess(res, result, 'MFA verified successfully');
    } catch (error) {
      return this.sendError(res, error.message, 400);
    }
  }

  async unenroll(req, res) {
    try {
      this.validateRequiredParams(req.body, ['supabaseToken', 'factorId']);
      const { supabaseToken, factorId } = req.body;
      const result = await this.mfaService.unenroll(req.user.uuid, supabaseToken, factorId);
      return this.sendSuccess(res, result, 'MFA unenrolled successfully');
    } catch (error) {
      return this.sendError(res, error.message, 400);
    }
  }
}

module.exports = MfaController;
