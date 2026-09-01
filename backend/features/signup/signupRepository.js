const BaseRepository = require('../../base/baseRepository');

/**
 * SignupRepository
 * Handles all database operations for the signup feature.
 * Communicates exclusively through queryHelper — no direct Supabase calls.
 */
class SignupRepository extends BaseRepository {
  /**
   * Checks whether an email address is already registered.
   */
  async emailExists(email) {
    const data = await this.queryHelper
      .from('users')
      .select('uuid')
      .where('email', 'eq', email)
      .where('archived_at', 'is', null)
      .execute();
    return data && data.length > 0;
  }

  /**
   * Inserts a new row into the `users` table.
   * Accepts an optional Knex transaction object (trx) for atomic operations.
   */
  async createUser({ uuid, email, passwordHash, language }, trx = null) {
    const db = trx || this.queryHelper.db;
    const result = await db('users')
      .insert({
        uuid,
        email,
        password_hash: passwordHash,
        language: language || 'en',
        status: 'active',
        is_mfa_enabled: false,
        is_email_verified: false,
        failed_login_attempts: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning('*');
    return result[0];
  }

  /**
   * Inserts a new row into the `user_details` table.
   * Accepts an optional Knex transaction object (trx) for atomic operations.
   */
  async createUserDetails(detailsData, trx = null) {
    const db = trx || this.queryHelper.db;
    
    // Ensure essential tracking fields are set
    const dataToInsert = {
      ...detailsData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db('user_details')
      .insert(dataToInsert)
      .returning('*');
    return true;
  }

  /**
   * Looks up a role by its name.
   */
  async getRoleByName(name) {
    const data = await this.queryHelper
      .from('roles')
      .select('uuid, name')
      .where('name', 'eq', name)
      .where('is_active', 'eq', true)
      .where('archived_at', 'is', null)
      .execute();
    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Inserts a user_roles row to assign a role to a user.
   * Accepts an optional Knex transaction object (trx) for atomic operations.
   */
  async assignUserRole({ uuid, userUuid, roleUuid }, trx = null) {
    const db = trx || this.queryHelper.db;
    await db('user_roles')
      .insert({
        uuid,
        user_uuid: userUuid,
        role_uuid: roleUuid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning('*');
    return true;
  }
}

module.exports = SignupRepository;
