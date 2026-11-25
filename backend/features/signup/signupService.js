const BaseService = require('../../base/baseService');
const SignupRepository = require('./signupRepository');
const argon2 = require('argon2');
const RedisHelper = require('../../redis/redisHelper');
const {
  signUpAuthUser,
  createAdminAuthUser,
  deleteAuthUser,
  resendAuthVerification
} = require('../../services/supabaseAdmin');

/**
 * SignupService
 * Orchestrates user registration business logic following Sofy conventions.
 */
class SignupService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new SignupRepository(context);
  }

  /**
   * Registers a new user account.
   */
  async processSignup(userData, onTransaction = null, isAdminCreation = false) {
    const { email, password, language } = userData;

    // 1. Email uniqueness check
    const emailExists = await this.repository.emailExists(email);
    if (emailExists) {
      throw new Error('An account with this email already exists.');
    }

    // 2. Hash password
    const passwordHash = await argon2.hash(password);

    // 3. Supabase Auth Signup
    const redirectTo = process.env.NODE_ENV === 'production'
      ? 'https://www.saanviworld.com/auth/callback'
      : 'http://localhost:5000/auth/callback';

    const { data: authData, error: signUpError } = isAdminCreation
      ? await createAdminAuthUser({ email, password })
      : await signUpAuthUser({ email, password, redirectTo });

    if (signUpError) {
      console.error('[SignupService] Supabase signUp error:', signUpError.message);
      throw new Error(signUpError.message);
    }

    if (!authData?.user?.id) {
      throw new Error('Failed to create authentication user in Supabase.');
    }

    // 4. UUIDs
    const userUuid = authData.user.id;
    const userDetailsUuid = this.generateUuid();
    const userRoleEntryUuid = this.generateUuid();

    // 5. Resolve the default 'user' role
    const roleName = 'user';
    const themeValue = null;

    const userRole = await this.repository.getRoleByName(roleName);
    if (!userRole) {
      await deleteAuthUser(userUuid);
      throw new Error(`Default '${roleName}' role not found. Please ensure it exists in the roles table.`);
    }

    // 6. Insert users, user_details and user_roles atomically
    try {
      await this.repository.transaction(async (trx) => {
        await this.repository.createUser(
          { uuid: userUuid, email, passwordHash, language: language || 'en', theme: themeValue },
          trx
        );

        await this.repository.createUserDetails(
          {
            uuid: userDetailsUuid,
            userUuid,
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: userData.displayName,
            phoneNumber: userData.phoneNumber,
            dateOfBirth: userData.dateOfBirth,
            gender: userData.gender,
          },
          trx
        );

        await this.repository.assignUserRole(
          { uuid: userRoleEntryUuid, userUuid, roleUuid: userRole.uuid },
          trx
        );

        if (typeof onTransaction === 'function') {
          await onTransaction(trx, userUuid);
        }
      });
    } catch (dbError) {
      console.error('[SignupService] Failed to insert public user records, rolling back Auth user:', dbError.message);
      await deleteAuthUser(userUuid);
      throw dbError;
    }

    return { message: 'Account created successfully. Please verify your email.', userUuid };
  }

  /**
   * Resends the verification email if the user is unverified.
   * Prevents abuse by applying rate limits.
   */
  async resendVerification(email) {
    const successMsg = 'If your account exists and is unverified, a verification email will be sent.';

    const user = await this.repository.getUserByEmail(email);
    if (!user || user.is_email_verified) {
      return { success: true, message: successMsg };
    }

    const rateLimitKey = `resend_verify:${email}`;
    const currentCount = await RedisHelper.get(rateLimitKey);
    if (currentCount && Number(currentCount) >= 5) {
      throw new Error('Please wait before requesting another verification email.');
    }

    const redirectTo = process.env.NODE_ENV === 'production'
      ? 'https://www.saanviworld.com/auth/callback'
      : 'http://localhost:5000/auth/callback';

    console.log(`[SignupService] Triggering Supabase resend for: ${email}`);

    // Call Supabase Auth resend via supabaseAdmin helper
    const { error } = await resendAuthVerification(email, redirectTo);

    if (error) {
      console.error('[SignupService] Supabase resend error:', error.message);
      return { success: true, message: successMsg };
    }

    if (!currentCount) {
      await RedisHelper.set(rateLimitKey, 1, 15 * 60); // 15 mins
    } else {
      await RedisHelper.increment(rateLimitKey);
    }

    return { success: true, message: successMsg };
  }
}

module.exports = SignupService;
