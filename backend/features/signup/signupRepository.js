const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

/**
 * SignupRepository
 * Handles all database operations for user registration following Sofy conventions.
 */
class SignupRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sqlUsers = new QueryHelper('users');
    this.sqlUserDetails = new QueryHelper('user_details');
    this.sqlRoles = new QueryHelper('roles');
    this.sqlUserRoles = new QueryHelper('user_roles');
  }

  /**
   * Checks whether an email address is already registered.
   */
  async emailExists(email) {
    const query = this.sqlUsers
      .select()
      .field('uuid')
      .where('email', '=', email)
      .whereNull('archived_at');
    const rows = await this.runQuery(query);
    return rows.length > 0;
  }

  /**
   * Retrieves basic user details by email.
   */
  async getUserByEmail(email) {
    const query = this.sqlUsers
      .select()
      .field('uuid')
      .field('email')
      .field('is_email_verified')
      .field('status')
      .where('email', '=', email)
      .whereNull('archived_at');
    return this.runQueryFirst(query);
  }

  /**
   * Inserts a new row into the `users` table.
   */
  async createUser({ uuid, email, passwordHash, language, theme }, trx = null) {
    const payload = {
      uuid,
      email,
      password_hash: passwordHash,
      language: language || 'en',
      status: 'inactive',
      is_mfa_enabled: false,
      is_email_verified: false,
      failed_login_attempts: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (theme) {
      payload.theme = theme;
    }

    const query = this.sqlUsers.insert(payload);
    const result = await this.dbDriver.execute(query, [], trx || this.context?.transaction);
    return result.rows?.[0] || payload;
  }

  /**
   * Inserts user profile details into the `user_details` table.
   */
  async createUserDetails(detailsData, trx = null) {
    const record = {
      uuid: detailsData.uuid,
      user_uuid: detailsData.userUuid,
      first_name: detailsData.firstName || null,
      last_name: detailsData.lastName || null,
      display_name: detailsData.displayName || null,
      phone_number: detailsData.phoneNumber || null,
      date_of_birth: detailsData.dateOfBirth || null,
      gender: detailsData.gender || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const query = this.sqlUserDetails.insert(record);
    await this.dbDriver.execute(query, [], trx || this.context?.transaction);
    return true;
  }

  /**
   * Looks up a role by its name.
   */
  async getRoleByName(name) {
    const query = this.sqlRoles
      .select()
      .field('uuid')
      .field('name')
      .where('name', '=', name)
      .where('is_active', '=', true)
      .whereNull('archived_at');
    return this.runQueryFirst(query);
  }

  /**
   * Inserts a user_roles row.
   */
  async assignUserRole({ uuid, userUuid, roleUuid }, trx = null) {
    const payload = {
      uuid,
      user_uuid: userUuid,
      role_uuid: roleUuid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const query = this.sqlUserRoles.insert(payload);
    await this.dbDriver.execute(query, [], trx || this.context?.transaction);
    return true;
  }
}

module.exports = SignupRepository;
