const BaseController = require('../../base/baseController');
const MfaService = require('./mfaService');

class MfaController extends BaseController {
  constructor(context) {
    super(context);
    this.mfaService = new MfaService(context);
  }

  async getStatus() {
    const result = await this.mfaService.getStatus(this.context.user.uuid);
    return this.respondOk(result, 'MFA status fetched successfully');
  }

  async enroll() {
    const result = await this.mfaService.enroll(this.context.user.email);
    return this.respondOk(result, 'MFA enrollment initialized');
  }

  async challenge(req) {
    this.validateRequiredParams(req.body, ['factorId']);
    const result = await this.mfaService.challenge(req.body.factorId, this.context.user.email);
    return this.respondOk(result, 'MFA challenge created');
  }

  async verify(req) {
    this.validateRequiredParams(req.body, ['factorId', 'code']);
    const { factorId, challengeId, code } = req.body;
    const result = await this.mfaService.verify(this.context.user.uuid, factorId, challengeId, code, this.context.user.email);
    return this.respondOk(result, 'MFA verified successfully');
  }

  async unenroll(req) {
    this.validateRequiredParams(req.body, ['factorId']);
    const { factorId } = req.body;
    const result = await this.mfaService.unenroll(this.context.user.uuid, factorId, this.context.user.email);
    return this.respondOk(result, 'MFA unenrolled successfully');
  }
}

module.exports = MfaController;
