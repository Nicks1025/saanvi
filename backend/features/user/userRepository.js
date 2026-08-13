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
      .field('ud.profile_image_url')
      .join('user_roles', 'ur', 'u.uuid = ur.user_uuid')
      .join('roles', 'r', 'ur.role_uuid = r.uuid')
      .join('role_permissions', 'rp', 'r.uuid = rp.role_uuid')
      .join('permissions', 'p', 'rp.permission_uuid = p.uuid')
      .field('p.permission')
      .field('p.is_active')
      .field('p.archived_at')
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
        profileImageUrl: user.profile_image_url || null,
        language: user.language || 'en',
        theme: user.theme || 'system',
        font: user.font || 'sans',
        permissions
      };
    }
    return null;
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
}

module.exports = UserRepository;
