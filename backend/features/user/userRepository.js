const BaseRepository = require('../../base/baseRepository');

class UserRepository extends BaseRepository {
  /**
   * Retrieves safe user profile data by UUID.
   */
  async getUserByUuid(uuid) {
    const usersData = await this.queryHelper
      .from('users')
      .select('uuid, email, is_mfa_enabled, is_email_verified, status, language, theme, font')
      .where('uuid', 'eq', uuid)
      .where('archived_at', 'is', null)
      .execute();

    if (usersData && usersData.length > 0) {
      const user = usersData[0];
      
      let details = {};
      try {
        const detailsData = await this.queryHelper
          .from('user_details')
          .select('first_name, last_name, display_name, profile_image_url')
          .where('user_uuid', 'eq', uuid)
          .where('archived_at', 'is', null)
          .execute();
        if (detailsData && detailsData.length > 0) {
          details = detailsData[0];
        }
      } catch (err) {
        console.error('[UserRepository] Failed to fetch user_details:', err.message);
      }

      return {
        uuid: user.uuid,
        email: user.email,
        isMfaEnabled: user.is_mfa_enabled,
        isEmailVerified: user.is_email_verified,
        status: user.status,
        firstName: details.first_name || null,
        lastName: details.last_name || null,
        displayName: details.display_name || null,
        profileImageUrl: details.profile_image_url || null,
        language: user.language || 'en',
        theme: user.theme || 'system',
        font: user.font || 'sans'
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
