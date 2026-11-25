const BaseRepository = require('../../base/baseRepository');
const QueryHelper = require('../../database/queryHelper');

class UserRepository extends BaseRepository {
  constructor(context = null) {
    super(context);
    this.sql = new QueryHelper('users', 'u');
    this.sqlUsersSimple = new QueryHelper('users');
    this.sqlUserDetails = new QueryHelper('user_details');
  }

  /**
   * Retrieves safe user profile data by UUID.
   */
  async getUserByUuid(uuid) {
    const query = this.sql
      .select()
      .field('u.uuid')
      .field('u.email')
      .field('u.is_mfa_enabled')
      .field('u.is_email_verified')
      .field('u.status')
      .field('u.language')
      .field('u.theme')
      .field('u.font')
      .field('ud.first_name')
      .field('ud.last_name')
      .field('ud.display_name')
      .field('ud.phone_number')
      .field('ud.date_of_birth')
      .field('ud.gender')
      .field('ud.profile_image_url')
      .leftJoin('user_details as ud', 'u.uuid', 'ud.user_uuid')
      .where('u.uuid', '=', uuid)
      .whereNull('u.archived_at');

    const user = await this.runQueryFirst(query);
    if (!user) {
      return null;
    }

    return {
      uuid: user.uuid,
      isMfaEnabled: user.is_mfa_enabled,
      isEmailVerified: user.is_email_verified,
      status: user.status,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      displayName: user.display_name || null,
      phoneNumber: user.phone_number || null,
      dateOfBirth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : null,
      gender: user.gender || null,
      profileImageUrl: user.profile_image_url || null,
      language: user.language || 'en',
      theme: user.theme || 'system',
      font: user.font || 'sans',
    };
  }

  /**
   * UPSERT user profile details.
   */
  async upsertUserProfile(profileData) {
    const {
      uuid, user_uuid, first_name, last_name, display_name,
      phone_number, date_of_birth, gender, profile_image_url
    } = profileData;

    const checkQuery = this.sqlUserDetails
      .select()
      .field('uuid')
      .where('user_uuid', '=', user_uuid);

    const existing = await this.runQueryFirst(checkQuery);

    if (existing) {
      const payload = {};
      if (first_name !== undefined) payload.first_name = first_name;
      if (last_name !== undefined) payload.last_name = last_name;
      if (display_name !== undefined) payload.display_name = display_name;
      if (phone_number !== undefined) payload.phone_number = phone_number;
      if (date_of_birth !== undefined) payload.date_of_birth = date_of_birth;
      if (gender !== undefined) payload.gender = gender;
      if (profile_image_url !== undefined) payload.profile_image_url = profile_image_url;
      payload.updated_at = new Date().toISOString();

      const updateQuery = this.sqlUserDetails
        .where('user_uuid', '=', user_uuid)
        .update(payload);
      await this.execute(updateQuery);
    } else {
      const insertQuery = this.sqlUserDetails
        .insert({
          uuid,
          user_uuid,
          first_name: first_name || null,
          last_name: last_name || null,
          display_name: display_name || null,
          phone_number: phone_number || null,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          profile_image_url: profile_image_url || null
        });
      await this.execute(insertQuery);
    }
    return true;
  }

  /**
   * Updates user settings (language, theme, font)
   */
  async updateUserSettings(uuid, settings) {
    const { language, theme, font } = settings;

    const payload = {};
    if (language !== undefined) payload.language = language;
    if (theme !== undefined) payload.theme = theme;
    if (font !== undefined) payload.font = font;

    if (Object.keys(payload).length === 0) {
      return true;
    }

    const query = this.sqlUsersSimple
      .where('uuid', '=', uuid)
      .update(payload);
    await this.execute(query);

    return true;
  }

  /**
   * Retrieves the user's password hash.
   */
  async getPasswordHash(uuid) {
    const query = this.sqlUsersSimple
      .select()
      .field('password_hash')
      .where('uuid', '=', uuid);
    const result = await this.runQueryFirst(query);
    return result?.password_hash || null;
  }

  /**
   * Updates the user's password hash.
   */
  async updatePassword(uuid, passwordHash) {
    const query = this.sqlUsersSimple
      .where('uuid', '=', uuid)
      .update({
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    await this.execute(query);
    return true;
  }

  /**
   * Transactionally soft-deletes a user and marks status as deleted.
   */
  async deleteUserData(uuid) {
    const query = this.sqlUsersSimple
      .where('uuid', '=', uuid)
      .update({
        archived_at: new Date().toISOString(),
        status: 'deleted',
        updated_at: new Date().toISOString()
      });
    await this.execute(query);
    return true;
  }
}

module.exports = UserRepository;
