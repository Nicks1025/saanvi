const BaseService = require('../../base/baseService');
const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../../services/supabaseAdmin');

class MfaService extends BaseService {
  constructor(mfaRepository) {
    super(mfaRepository);
  }

  // Helper to initialize a user-scoped client
  _getUserClient(supabaseToken) {
    if (!supabaseToken) throw new Error('Unauthorized');
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${supabaseToken}` } }
    });
  }

  async getStatus(userUuid) {
    const data = await this.repository.queryHelper
      .from('users')
      .select('is_mfa_enabled')
      .where('uuid', 'eq', userUuid)
      .execute();
      
    if (!data || data.length === 0) return { is_mfa_enabled: false };
    return { is_mfa_enabled: data[0].is_mfa_enabled };
  }

  async enroll(supabaseToken, email) {
    const userClient = this._getUserClient(supabaseToken);
    const { data, error } = await userClient.auth.mfa.enroll({ 
      factorType: 'totp',
      issuer: 'Saanvi',
      friendlyName: email
    });
    if (error) {
      throw new Error(`Enrollment failed: ${error.message}`);
    }
    return data;
  }

  async challenge(supabaseToken, factorId) {
    const userClient = this._getUserClient(supabaseToken);
    const { data, error } = await userClient.auth.mfa.challenge({ factorId });
    if (error) {
      throw new Error(`Challenge failed: ${error.message}`);
    }
    return data;
  }

  async verify(userUuid, supabaseToken, factorId, challengeId, code) {
    const userClient = this._getUserClient(supabaseToken);
    const { data, error } = await userClient.auth.mfa.verify({
      factorId,
      challengeId,
      code
    });
    
    if (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }

    // Update database to enable MFA for user
    await this.repository.queryHelper
      .from('users')
      .where('uuid', 'eq', userUuid)
      .update({ is_mfa_enabled: true })
      .execute();

    return { success: true };
  }

  async unenroll(userUuid, supabaseToken, factorId) {
    // Unenroll using admin client since normal user client cannot delete their own factors if they aren't AAL2 yet
    const userClient = this._getUserClient(supabaseToken);
    const { data: { user } } = await userClient.auth.getUser();
    
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
    await this.repository.queryHelper
      .from('users')
      .where('uuid', 'eq', userUuid)
      .update({ is_mfa_enabled: false })
      .execute();

    return { success: true };
  }
}

module.exports = MfaService;
