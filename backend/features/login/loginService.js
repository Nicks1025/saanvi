const BaseService = require('../../base/baseService');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { supabaseAdmin, getUserSupabaseClient, syncSupabaseAuth } = require('../../services/supabaseAdmin');
const { getAccessTokenExpiry, getRefreshTokenExpiryMs } = require('./tokenConfig');
const LoginRepository = require('./loginRepository');

class LoginService extends BaseService {
  constructor(context = null) {
    super(context);
    this.repository = new LoginRepository(context);
  }

  /**
   * Processes the login business logic: retrieves user and verifies password.
   */
  async processLogin(email, password) {
    // 1. Retrieve user by email
    const user = await this.repository.getUserByEmail(email);

    if (!user) {
      throw new Error('No user exists with this email, please register youself.');
    }
    if (user.status === 'archived') {
      throw new Error('Your account has been suspended by Admin, please contact admin to get your query resolved.');
    }

    if (user.status === 'locked') {
      throw new Error('Account is locked. Please try again later.');
    }

    // 2. Verify password hash first to prevent enumeration
    try {
      const isPasswordValid = await argon2.verify(user.password_hash, password);

      if (!isPasswordValid) {
        throw new Error('Invalid email or password.');
      }
    } catch (err) {
      throw new Error('Invalid email or password.');
    }

    // 3. Check if email is verified AFTER password validation
    if (!user.is_email_verified) {
      throw new Error('UNVERIFIED_EMAIL');
    }

    // 4. Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    if (user.is_mfa_enabled) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('Server configuration error: JWT_SECRET missing.');
      }
      const mfaTicket = jwt.sign(
        { email: user.email, purpose: 'mfa_login' },
        secret,
        { expiresIn: '5m' }
      );
      return {
        mfaRequired: true,
        email: user.email,
        mfaTicket
      };
    }

    // 5. Update last_login_at timestamp and return success result
    await this.repository.updateLastLogin(user.uuid);

    return {
      token: accessToken,
      refreshToken
    };
  }

  /**
   * Processes Google login logic: exchanges code for token, verifies, checks email against users.
   */
  async processGoogleLogin(googleAccessToken) {
    let payload;
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user info from Google.');
      }
      payload = await response.json();
    } catch (error) {
      throw new Error('Google authentication failed.');
    }

    const { email, email_verified } = payload;
    if (!email_verified) {
      throw new Error('Google authentication failed.');
    }

    // 1. Retrieve user by email (strictly existing user only)
    const user = await this.repository.getUserByEmail(email);
    if (!user) {
      throw new Error('No user exists with this email, please register youself.');
    }

    if (!user.is_email_verified) {
      throw new Error('UNVERIFIED_EMAIL');
    }

    if (user.status === 'archived') {
      throw new Error('Your account has been suspended by Admin, please contact admin to get your query resolved');
    }

    if (user.status === 'locked') {
      throw new Error('Account is locked. Please try again later.');
    }

    // 2. Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    if (user.is_mfa_enabled) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('Server configuration error: JWT_SECRET missing.');
      }
      const mfaTicket = jwt.sign(
        { email: user.email, purpose: 'mfa_login' },
        secret,
        { expiresIn: '5m' }
      );
      return {
        mfaRequired: true,
        email: user.email,
        mfaTicket
      };
    }

    // 3. Update last_login_at timestamp and return success result
    await this.repository.updateLastLogin(user.uuid);

    return {
      token: accessToken,
      refreshToken
    };
  }

  /**
   * Lazily synchronizes a user with Supabase Auth (auth.users)
   * so we can acquire a valid GoTrue session for MFA operations.
   */
  async syncSupabaseAuth(email) {
    return await syncSupabaseAuth(email, this.repository.queryHelper);
  }

  /**
   * Processes the second step of MFA login: verifies the TOTP code against Supabase Auth,
   * then issues the final custom JWT.
   */
  async processMfaVerify(email, code, mfaTicket) {
    if (!mfaTicket) {
      throw new Error('MFA ticket is required.');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Server configuration error: JWT_SECRET missing.');
    }

    let decoded;
    try {
      decoded = jwt.verify(mfaTicket, secret);
    } catch (e) {
      throw new Error('Invalid or expired MFA ticket.');
    }

    if (decoded.email !== email || decoded.purpose !== 'mfa_login') {
      throw new Error('Invalid MFA ticket.');
    }

    const user = await this.repository.getUserByEmail(email);
    if (!user) throw new Error('Invalid email or password.');

    const token = await this.syncSupabaseAuth(email);
    if (!token) throw new Error('Failed to synchronize MFA session.');
    const userSupabase = getUserSupabaseClient(token);

    const { data: factors, error: factorsError } = await userSupabase.auth.mfa.listFactors();
    if (factorsError || !factors || !factors.totp || factors.totp.length === 0) {
      throw new Error('No MFA factor found.');
    }

    const totpFactor = factors.totp[0];

    const { data: challenge, error: challengeError } = await userSupabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeError) {
      throw new Error('MFA Challenge failed.');
    }

    const { data: verifyData, error: verifyError } = await userSupabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code
    });

    if (verifyError) {
      throw new Error('Invalid MFA code.');
    }

    // Generate final tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    await this.repository.updateLastLogin(user.uuid);

    return {
      token: accessToken,
      refreshToken
    };
  }
  async generateTokens(user, transaction = null) {
    const tokenPayload = {
      uuid: user.uuid,
      email: user.email,
      is_mfa_enabled: user.is_mfa_enabled,
      language: user.language,
      theme: user.theme,
      font: user.font,
      roles: user.role_name || null,
      permissions: user.permissions || []
    };

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('Server configuration error: JWT_SECRET missing.');
    }
    const accessToken = jwt.sign(tokenPayload, secret, { expiresIn: getAccessTokenExpiry() });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiresAt = new Date(Date.now() + getRefreshTokenExpiryMs());

    await this.repository.saveRefreshToken(user.uuid, tokenHash, expiresAt.toISOString(), transaction);

    return { accessToken, refreshToken };
  }

  async processRefreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    return await this.repository.transaction(async (trx) => {
      // 1. Atomically consume the existing refresh token
      const tokenRecord = await this.repository.consumeRefreshToken(tokenHash, trx);

      if (!tokenRecord) {
        throw new Error('Invalid or expired refresh token');
      }

      // 2. Retrieve user's latest account status, roles and permissions inside transaction
      const user = await this.repository.getUserByUuid(tokenRecord.user_uuid, trx);
      if (!user || user.status !== 'active') {
        throw new Error('User is inactive or deleted');
      }

      // 3. Generate replacement tokens and persist replacement refresh token inside the same transaction
      return await this.generateTokens(user, trx);
    });
  }

  async logout(refreshToken) {
    if (!refreshToken) return;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.repository.revokeRefreshTokenByHash(tokenHash);
  }
}

module.exports = LoginService;
