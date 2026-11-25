const BaseService = require('../../base/baseService');
const UserRepository = require('./userRepository');
const storageService = require('../../services/storageService');
const argon2 = require('argon2');

class UserService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new UserRepository(context);
  }

  /**
   * Retrieves the current user's profile.
   */
  async getCurrentUser(uuid) {
    const user = await this.repository.getUserByUuid(uuid);
    if (!user) {
      throw new Error('User not found.');
    }
    return { user };
  }

  /**
   * Updates the user's profile details and handles profile image upload.
   */
  async updateUserProfile(userUuid, profileData, file) {
    if (profileData.firstName && profileData.firstName.length > 100) throw new Error('First name is too long');
    if (profileData.lastName && profileData.lastName.length > 100) throw new Error('Last name is too long');
    if (profileData.displayName && profileData.displayName.length > 200) throw new Error('Display name is too long');
    if (profileData.phoneNumber && profileData.phoneNumber.length > 30) throw new Error('Phone number is too long');
    if (profileData.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(profileData.gender)) {
      throw new Error('Invalid gender');
    }
    if (profileData.dateOfBirth) {
      const date = new Date(profileData.dateOfBirth);
      if (isNaN(date.getTime())) throw new Error('Invalid date of birth');
    }

    const existingUser = await this.repository.getUserByUuid(userUuid);
    if (!existingUser) throw new Error('User not found');

    let newProfileImageUrl = undefined;
    const oldProfileImageUrl = existingUser.profileImageUrl;

    if (file) {
      const extension = file.mimetype.split('/')[1];
      const fileName = `profile_${Date.now()}.${extension}`;
      const destinationPath = `profile-images/${userUuid}/${fileName}`;
      newProfileImageUrl = await storageService.uploadFile(file.buffer, destinationPath, file.mimetype);
    }

    const payload = {
      uuid: this.generateUuid(),
      user_uuid: userUuid,
      first_name: profileData.firstName,
      last_name: profileData.lastName,
      display_name: profileData.displayName,
      phone_number: profileData.phoneNumber,
      dateOfBirth: profileData.dateOfBirth === '' ? null : profileData.dateOfBirth,
      gender: profileData.gender
    };

    if (newProfileImageUrl) {
      payload.profile_image_url = newProfileImageUrl;
    } else if (profileData.removeImage === 'true') {
      payload.profile_image_url = null;
    }

    await this.repository.upsertUserProfile(payload);

    if ((newProfileImageUrl || profileData.removeImage === 'true') && oldProfileImageUrl) {
      storageService.deleteFile(oldProfileImageUrl).catch(console.error);
    }

    const updatedUser = await this.repository.getUserByUuid(userUuid);
    return { user: updatedUser };
  }

  /**
   * Updates the current user's settings.
   */
  async updateUserSettings(uuid, settings) {
    await this.repository.updateUserSettings(uuid, settings);
    return { success: true };
  }

  /**
   * Changes the user's password.
   */
  async changePassword(userUuid, currentPassword, newPassword) {
    const currentHash = await this.repository.getPasswordHash(userUuid);
    if (!currentHash) {
      throw new Error('User not found.');
    }

    try {
      const isPasswordValid = await argon2.verify(currentHash, currentPassword);
      if (!isPasswordValid) {
        throw new Error('Invalid current password.');
      }
    } catch (err) {
      throw new Error('Invalid current password.');
    }

    const newPasswordHash = await argon2.hash(newPassword);
    await this.repository.updatePassword(userUuid, newPasswordHash);
    return { success: true };
  }

  /**
   * Deletes the user's account permanently with transaction-safe local state cleanup.
   */
  async deleteAccount(uuid) {
    const user = await this.repository.getUserByUuid(uuid);
    if (!user) throw new Error('User not found.');

    // Transactional local record deletion/soft-deletion
    if (this.context?.connection?.transaction) {
      await this.context.connection.transaction(async (trx) => {
        const trxContext = this.context.withTransaction(trx);
        const repo = new UserRepository(trxContext);
        await repo.deleteUserData(uuid);
      });
    } else {
      await this.repository.deleteUserData(uuid);
    }

    // Cleanup external provider
    try {
      const { supabaseAdmin } = require('../../services/supabaseAdmin');
      if (supabaseAdmin?.auth?.admin?.deleteUser) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(uuid);
        if (error) {
          console.error('[UserService] Supabase self-delete error:', error.message);
        }
      }
    } catch (e) {
      console.warn('[UserService] External auth deletion warning:', e.message);
    }

    return { message: 'Account deleted successfully.' };
  }
}

module.exports = UserService;
