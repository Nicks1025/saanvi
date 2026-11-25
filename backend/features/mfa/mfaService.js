const BaseService = require('../../base/baseService');
const MfaRepository = require('./mfaRepository');
const { supabaseAdmin, getUserSupabaseClient, syncSupabaseAuth } = require('../../services/supabaseAdmin');

class MfaService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new MfaRepository(context);
  }

  // Server-side only: acquires valid user client for the authenticated user
  async _getServerUserClient(email) {
    const token = await syncSupabaseAuth(email);
    if (!token) {
      throw new Error('Failed to synchronize MFA session');
    }
    const userClient = getUserSupabaseClient(token);
    const { data: { user } } = await userClient.auth.getUser();
    return { userClient, user };
  }

  async getStatus(userUuid) {
    const status = await this.repository.getUserMfaStatus(userUuid);
    return { isMfaEnabled: Boolean(status?.isMfaEnabled) };
  }

  async enroll(email) {
    const { userClient, user } = await this._getServerUserClient(email);

    // First, find and delete any existing unverified TOTP factors for this user
    if (user) {
      const { data: factorsData } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
      if (factorsData && factorsData.factors) {
        for (const factor of factorsData.factors) {
          if (factor.factor_type === 'totp' && factor.status === 'unverified') {
            await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: user.id });
          }
        }
      }
    }

    const { data, error } = await userClient.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Saanvi',
      friendlyName: email
    });
    if (error) {
      console.error('[Supabase MFA Enroll Error]:', error);
      throw new Error(`Enrollment failed: ${error.message}`);
    }
    return data;
  }

  async challenge(factorId, email) {
    const { userClient } = await this._getServerUserClient(email);
    const { data, error } = await userClient.auth.mfa.challenge({ factorId });
    if (error) {
      throw new Error(`Challenge failed: ${error.message}`);
    }
    return data;
  }

  async verify(userUuid, factorId, challengeId, code, email) {
    const { userClient } = await this._getServerUserClient(email);

    let activeChallengeId = challengeId;
    if (!activeChallengeId) {
      const { data: challengeData, error: challengeError } = await userClient.auth.mfa.challenge({ factorId });
      if (challengeError) {
        throw new Error(`Challenge failed: ${challengeError.message}`);
      }
      activeChallengeId = challengeData.id;
    }

    let { data, error } = await userClient.auth.mfa.verify({
      factorId,
      challengeId: activeChallengeId,
      code
    });

    if (error && (error.message.includes('expired') || error.message.includes('challenge'))) {
      const { data: retryChallenge, error: retryError } = await userClient.auth.mfa.challenge({ factorId });
      if (!retryError && retryChallenge?.id) {
        const retryResult = await userClient.auth.mfa.verify({
          factorId,
          challengeId: retryChallenge.id,
          code
        });
        data = retryResult.data;
        error = retryResult.error;
      }
    }

    if (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }

    // Update database to enable MFA for user
    await this.repository.setUserMfaEnabled(userUuid, true);

    return { success: true };
  }

  async unenroll(userUuid, factorId, email) {
    const { user } = await this._getServerUserClient(email);

    if (!user) throw new Error('Unenrollment failed: user not found');

    let targetFactorId = factorId;

    if (factorId === 'totp') {
      const { data: factors, error: factorsError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
      if (factorsError) throw new Error('Could not fetch user factors');

      const totpFactor = factors.factors.find(f => f.factor_type === 'totp');
      if (!totpFactor) throw new Error('No TOTP factor found to unenroll');

      targetFactorId = totpFactor.id;
    }

    const { error } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
      id: targetFactorId,
      userId: user.id
    });

    if (error) {
      throw new Error(`Unenrollment failed: ${error.message}`);
    }

    // Update database to disable MFA
    await this.repository.setUserMfaEnabled(userUuid, false);

    return { success: true };
  }
}

module.exports = MfaService;
