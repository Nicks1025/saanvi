const BaseService = require('../../base/baseService');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

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
      throw new Error('Invalid email or password.');
    }

    if (user.status === 'archived' || user.status === 'inactive') {
       throw new Error('Invalid email or password.');
    }

    if (user.status === 'locked') {
      throw new Error('Account is locked. Please try again later.');
    }

    // 2. Verify password hash
    try {
      const isPasswordValid = await argon2.verify(user.password_hash, password);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password.');
      }
    } catch (err) {
      // Catch argon2 errors and obfuscate
      throw new Error('Invalid email or password.');
    }

    // 3. Generate token
    const tokenPayload = {
      uuid: user.uuid,
      email: user.email,
      is_mfa_enabled: user.is_mfa_enabled
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });

    // 4. Return success result without password_hash
    return {
      token,
      user: {
        uuid: user.uuid,
        email: user.email,
        is_mfa_enabled: user.is_mfa_enabled
      }
    };
  }

  /**
   * Processes Google login logic: exchanges code for token, verifies, checks email against users.
   */
  async processGoogleLogin(code) {
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL || 'postmessage'
    );

    let payload;
    try {
      const { tokens } = await client.getToken(code);
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
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
      throw new Error('Invalid email or password.');
    }

    if (user.status === 'archived' || user.status === 'inactive') {
      throw new Error('Google authentication failed.');
    }

    if (user.status === 'locked') {
      throw new Error('Account is locked. Please try again later.');
    }

    // 2. Generate token (reusing same token payload pattern)
    const tokenPayload = {
      uuid: user.uuid,
      email: user.email,
      is_mfa_enabled: user.is_mfa_enabled
    };

    const secret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(tokenPayload, secret, { expiresIn: '1h' });

    // 3. Return success result
    return {
      token,
      user: {
        uuid: user.uuid,
        email: user.email,
        is_mfa_enabled: user.is_mfa_enabled
      }
    };
  }
}

module.exports = LoginService;
