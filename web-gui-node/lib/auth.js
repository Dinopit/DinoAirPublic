// Authentication utilities for Supabase
const { supabase, supabaseAdmin } = require('./supabase');

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Auth response with user data or error
 */
async function signUpUser(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  return { data, error };
}

/**
 * Sign in a user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Auth response with session data or error
 */
async function signInUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

/**
 * Sign out the current user
 * @returns {Promise<Object>} Response with error if any
 */
async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current user session
 * @returns {Promise<Object>} Current session data or null
 */
async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return { session: null, error };
  }

  return { session: data.session, error: null };
}

/**
 * Get the current user
 * @returns {Promise<Object>} Current user data or null
 */
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting user:', error);
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

/**
 * Reset password for a user
 * @param {string} email - User email
 * @returns {Promise<Object>} Response with error if any
 */
async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.PUBLIC_URL}/reset-password`,
  });

  return { error };
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Response with error if any
 */
async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Create a new API key for a user (admin function)
 * @param {string} userId - User ID
 * @param {string} name - Key name/description
 * @returns {Promise<Object>} Created API key or error
 */
async function createApiKey(userId, name) {
  // Generate a random API key
  const key = 'dinoair_' + Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 36).toString(36)).join('');

  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .insert([{
      user_id: userId,
      name,
      key,
      created_at: new Date().toISOString(),
    }])
    .select();

  if (error) {
    console.error('Error creating API key:', error);
    return { apiKey: null, error };
  }

  return { apiKey: data[0], error: null };
}

/**
 * Verify an API key
 * @param {string} apiKey - API key to verify
 * @returns {Promise<Object>} User ID associated with key or null if invalid
 */
async function verifyApiKey(apiKey) {
  const { data, error } = await supabaseAdmin
    .from('api_keys')
    .select('user_id')
    .eq('key', apiKey)
    .eq('active', true)
    .single();

  if (error || !data) {
    console.error('Invalid API key:', apiKey);
    return { userId: null, error: error || new Error('Invalid API key') };
  }

  return { userId: data.user_id, error: null };
}

module.exports = {
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentSession,
  getCurrentUser,
  resetPassword,
  updatePassword,
  createApiKey,
  verifyApiKey
};
