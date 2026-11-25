const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

/**
 * MfaRepository
 * Owns all database queries for MFA status and flags following Sofy conventions.
 */
class MfaRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('users');
  }

  async getUserMfaStatus(userUuid) {
    const query = this.sql
      .select()
      .field('is_mfa_enabled')
      .where('uuid', '=', userUuid)
      .whereNull('archived_at');

    const row = await this.runQueryFirst(query);
    return {
      isMfaEnabled: row ? Boolean(row.is_mfa_enabled) : false
    };
  }

  async setUserMfaEnabled(userUuid, isEnabled) {
    const query = this.sql
      .where('uuid', '=', userUuid)
      .update({ is_mfa_enabled: Boolean(isEnabled), updated_at: new Date() });

    return await this.execute(query);
  }
}

module.exports = MfaRepository;
