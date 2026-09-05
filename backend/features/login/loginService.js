const BaseService = require('../../base/baseService');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { supabaseAdmin } = require('../../services/supabaseAdmin');

class LoginService extends BaseService {
  constructor(loginRepository) {
    super(loginRepository);
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

    // 4. Generate token
    const tokenPayload = {
      uuid: user.uuid,
      email: user.email,
      is_mfa_enabled: user.is_mfa_enabled,
      language: user.language,
      theme: user.theme,
      font: user.font,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
      permissions: user.permissions || []
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });

    // 4. Sync with Supabase Auth to get an access token for MFA
    let supabaseToken = null;
    try {
      supabaseToken = await this.syncSupabaseAuth(user.email);
    } catch (e) {
      console.error('[Supabase Sync Error]', e);
    }

    if (user.is_mfa_enabled) {
      return {
        mfaRequired: true,
        email: user.email,
        supabaseToken
      };
    }

    // 5. Return success result
    return {
      token,
      supabaseToken
    };
  }

  /**
   * Processes Google login logic: exchanges code for token, verifies, checks email against users.
   */
  async processGoogleLogin(accessToken) {
    let payload;
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
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

    // 2. Generate token
    const tokenPayload = {
      uuid: user.uuid,
      email: user.email,
      is_mfa_enabled: user.is_mfa_enabled,
      language: user.language,
      theme: user.theme,
      font: user.font,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
      permissions: user.permissions || []
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });

    // 3. Sync with Supabase Auth to get an access token for MFA
    let supabaseToken = null;
    try {
      supabaseToken = await this.syncSupabaseAuth(user.email);
    } catch (e) {
      console.error('[Supabase Sync Error]', e);
    }

    if (user.is_mfa_enabled) {
      return {
        mfaRequired: true,
        email: user.email,
        supabaseToken
      };
    }

    // 4. Return success result
    return {
      token,
      supabaseToken
    };
  }

  /**
   * Lazily synchronizes a user with Supabase Auth (auth.users)
   * so we can acquire a valid GoTrue session for MFA operations.
   */
  async syncSupabaseAuth(email) {
    let supabaseUserId = null;
    try {
      const result = await this.repository.queryHelper.queryRaw('SELECT id FROM auth.users WHERE email = ?', [email]);
      if (result && result.rows && result.rows.length > 0) {
        supabaseUserId = result.rows[0].id;
      }
    } catch (e) {
      console.warn('Could not query auth.users directly', e.message);
    }

    const tempPassword = crypto.randomBytes(24).toString('hex') + 'Aa1!';

    if (!supabaseUserId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true
      });
      if (!error && data.user) {
        supabaseUserId = data.user.id;
      }
    } else {
      await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, { password: tempPassword });
    }

    const { data: authData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({ 
      email, 
      password: tempPassword 
    });

    if (signInError) {
      console.error('[Supabase Auth Sync Error]', signInError);
      return null;
    }
    
    return authData.session.access_token;
  }

  /**
   * Processes the second step of MFA login: verifies the TOTP code against Supabase Auth,
   * then issues the final custom JWT.
   */
  async processMfaVerify(email, code, supabaseToken) {
    const user = await this.repository.getUserByEmail(email);
    if (!user) throw new Error('Invalid email or password.');

    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${supabaseToken}` } }
    });

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

    // Generate final token
    const tokenPayload = {
      uuid: user.uuid,
      email: user.email,
      is_mfa_enabled: user.is_mfa_enabled,
      language: user.language,
      theme: user.theme,
      font: user.font,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: user.display_name,
      profileImageUrl: user.profile_image_url,
      permissions: user.permissions || []
    };
    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });

    return {
      token,
      supabaseToken
    };
  }
}

module.exports = LoginService;
