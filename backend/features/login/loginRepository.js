const BaseRepository = require('../../base/baseRepository');

class LoginRepository extends BaseRepository {
  /**
   * Retrieves user authentication details by email.
   * STRICT RULE: Never query Supabase directly here. Always use queryHelper.
   */
  async getUserByEmail(email) {
    const data = await this.queryHelper
      .from('users')
      .select('uuid, email, password_hash, is_mfa_enabled, status')
      .where('email', 'eq', email)
      .where('archived_at', 'is', null)
      .execute();

    return data && data.length > 0 ? data[0] : null;
  }
}

module.exports = LoginRepository;
