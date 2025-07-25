// Database utilities for Supabase
const { supabaseAdmin } = require('./supabase');

/**
 * Get all users from the database
 * @returns {Promise<Array>} List of users
 */
async function getUsers() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data;
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null if not found
 */
async function getUserById(userId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }

  return data;
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object|null>} Created user or null if error
 */
async function createUser(userData) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert([userData])
    .select();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return data[0];
}

/**
 * Update an existing user
 * @param {string} userId - User ID
 * @param {Object} updates - User data updates
 * @returns {Promise<Object|null>} Updated user or null if error
 */
async function updateUser(userId, updates) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select();

  if (error) {
    console.error(`Error updating user ${userId}:`, error);
    return null;
  }

  return data[0];
}

/**
 * Store a chat session
 * @param {Object} chatData - Chat session data
 * @returns {Promise<Object|null>} Created chat session or null if error
 */
async function storeChatSession(chatData) {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .insert([chatData])
    .select();

  if (error) {
    console.error('Error storing chat session:', error);
    return null;
  }

  return data[0];
}

/**
 * Get chat history for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} List of chat sessions
 */
async function getUserChatHistory(userId) {
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching chat history for user ${userId}:`, error);
    return [];
  }

  return data;
}

/**
 * Store system metrics
 * @param {Object} metricsData - System metrics data
 * @returns {Promise<Object|null>} Created metrics entry or null if error
 */
async function storeSystemMetrics(metricsData) {
  const { data, error } = await supabaseAdmin
    .from('system_metrics')
    .insert([metricsData])
    .select();

  if (error) {
    console.error('Error storing system metrics:', error);
    return null;
  }

  return data[0];
}

/**
 * Store API request logs
 * @param {Object} logData - API request log data
 * @returns {Promise<Object|null>} Created log entry or null if error
 */
async function storeApiLog(logData) {
  const { data, error } = await supabaseAdmin
    .from('api_logs')
    .insert([logData])
    .select();

  if (error) {
    console.error('Error storing API log:', error);
    return null;
  }

  return data[0];
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  storeChatSession,
  getUserChatHistory,
  storeSystemMetrics,
  storeApiLog
};
