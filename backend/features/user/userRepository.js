const BaseRepository = require('../../base/baseRepository');

class UserRepository extends BaseRepository {
  /**
   * Retrieves safe user profile data by UUID.
   */
  async getUserByUuid(uuid) {
    const usersData = await this.queryHelper
      .from('users', 'u')
      .field('u.uuid')
      .field('u.email')
      .field('u.is_mfa_enabled')
      .field('u.is_email_verified')
      .field('u.status')
      .field('u.language')
      .field('u.theme')
      .field('u.font')
      .leftJoin('user_details', 'ud', 'u.uuid = ud.user_uuid')
      .field('ud.first_name')
      .field('ud.last_name')
      .field('ud.display_name')
      .field('ud.phone_number')
      .field('ud.date_of_birth')
      .field('ud.gender')
      .field('ud.profile_image_url')
      .join('user_roles', 'ur', 'u.uuid = ur.user_uuid')
      .join('roles', 'r', 'ur.role_uuid = r.uuid')
      .join('role_permissions', 'rp', 'r.uuid = rp.role_uuid')
      .join('permissions', 'p', 'rp.permission_uuid = p.uuid')
      .field('p.permission')
      .field('p.is_active')
      .field('p.archived_at')
      .field('r.name as role_name')
      .field('r.is_active as role_is_active')
      .field('r.archived_at as role_archived_at')
      .where('u.uuid', 'eq', uuid)
      .where('u.archived_at', 'is', null)
      .where('p.is_active', 'eq', true)
      .where('p.archived_at', 'is', null)
      .where('r.is_active', 'eq', true)
      .where('r.archived_at', 'is', null)
      .execute();

    if (usersData && usersData.length > 0) {
      // With raw SQL joins, we get flat rows. We need to grab the user details from the first row,
      // and extract all unique permissions from all rows.
      const user = usersData[0];
      
      const permissions = [...new Set(usersData.map(row => row.permission).filter(Boolean))];

      return {
        uuid: user.uuid,
        email: user.email,
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
        permissions,
        roles: user.role_name
      };
    }
    return null;
  }

  /**
   * UPSERT user profile details.
   */
  async upsertUserProfile(profileData) {
    const { 
      uuid, user_uuid, first_name, last_name, display_name, 
      phone_number, date_of_birth, gender, profile_image_url 
    } = profileData;

    // Check if record exists
    const existing = await this.queryHelper
      .from('user_details')
      .where('user_uuid', 'eq', user_uuid)
      .execute();

    if (existing && existing.length > 0) {
      // Update
      const payload = {};
      if (first_name !== undefined) payload.first_name = first_name;
      if (last_name !== undefined) payload.last_name = last_name;
      if (display_name !== undefined) payload.display_name = display_name;
      if (phone_number !== undefined) payload.phone_number = phone_number;
      if (date_of_birth !== undefined) payload.date_of_birth = date_of_birth;
      if (gender !== undefined) payload.gender = gender;
      if (profile_image_url !== undefined) payload.profile_image_url = profile_image_url;
      
      payload.updated_at = new Date().toISOString();

      await this.queryHelper
        .from('user_details')
        .update(payload)
        .where('user_uuid', 'eq', user_uuid)
        .execute();
    } else {
      // Insert
      await this.queryHelper
        .from('user_details')
        .insert([{
          uuid,
          user_uuid,
          first_name: first_name || null,
          last_name: last_name || null,
          display_name: display_name || null,
          phone_number: phone_number || null,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          profile_image_url: profile_image_url || null
        }])
        .execute();
    }
    return true;
  }

  /**
   * Updates user settings (language, theme, font)
   */
  async updateUserSettings(uuid, settings) {
    const { language, theme, font } = settings;
    
    // Only update the fields that are provided, but default to undefined if not in payload
    const payload = {};
    if (language !== undefined) payload.language = language;
    if (theme !== undefined) payload.theme = theme;
    if (font !== undefined) payload.font = font;

    if (Object.keys(payload).length === 0) {
      return true; // Nothing to update
    }

    await this.queryHelper
      .from('users')
      .update(payload)
      .where('uuid', 'eq', uuid)
      .execute();

    return true;
  }
  /**
   * Retrieves the user's password hash.
   */
  async getPasswordHash(uuid) {
    const result = await this.queryHelper
      .from('users')
      .field('password_hash')
      .where('uuid', 'eq', uuid)
      .execute();
      
    if (result && result.length > 0) {
      return result[0].password_hash;
    }
    return null;
  }

  /**
   * Updates the user's password hash.
   */
  async updatePassword(uuid, passwordHash) {
    await this.queryHelper
      .from('users')
      .update({
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .where('uuid', 'eq', uuid)
      .execute();
    return true;
  }
}

module.exports = UserRepository;
