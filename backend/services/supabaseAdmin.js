const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

// Create a Supabase admin client using the service role key (bypasses RLS for admin operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client helper for public auth operations (signup, resend verification)
const getSupabaseAnonClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey || supabaseServiceRoleKey);
};

const signUpAuthUser = async ({ email, password, redirectTo }) => {
  const client = getSupabaseAnonClient();
  return await client.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo }
  });
};

const createAdminAuthUser = async ({ email, password }) => {
  return await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false
  });
};

const deleteAuthUser = async (userUuid) => {
  return await supabaseAdmin.auth.admin.deleteUser(userUuid);
};

const resendAuthVerification = async (email, redirectTo) => {
  const client = getSupabaseAnonClient();
  return await client.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectTo }
  });
};

const crypto = require('crypto');
const dbDriver = require('../database/dbDriver');

const getUserSupabaseClient = (supabaseToken) => {
  if (!supabaseToken) throw new Error('Unauthorized');
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: { headers: { Authorization: `Bearer ${supabaseToken}` } }
  });
};

const syncSupabaseAuth = async (email) => {
  let supabaseUserId = null;
  try {
    const rows = await dbDriver.runQueryRaw('SELECT id FROM auth.users WHERE email = ?', [email]);
    if (rows && rows.length > 0) {
      supabaseUserId = rows[0].id;
    }
  } catch (e) {
    console.warn('[syncSupabaseAuth] Could not query auth.users directly:', e.message);
  }

  const tempPassword = crypto.randomBytes(24).toString('hex') + 'Aa1!';

  if (!supabaseUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });
    if (!error && data?.user) {
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
  
  return authData?.session?.access_token || null;
};

module.exports = {
  supabaseAdmin,
  supabaseUrl,
  supabaseServiceRoleKey,
  getSupabaseAnonClient,
  getUserSupabaseClient,
  syncSupabaseAuth,
  signUpAuthUser,
  createAdminAuthUser,
  deleteAuthUser,
  resendAuthVerification
};
