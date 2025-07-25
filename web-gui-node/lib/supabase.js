/**
 * Supabase Client Configuration
 * Provides database connection and utility functions for DinoAir
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

// Create Supabase client with anonymous key (for public operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

// Create Supabase client with service role key (for admin operations)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Test database connectivity
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
}

/**
 * Initialize database tables if they don't exist
 * @returns {Promise<boolean>} True if initialization is successful
 */
async function initializeTables() {
  try {
    // Check if tables exist by trying to query them
    const { error: sessionsError } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .limit(1);

    const { error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('id')
      .limit(1);

    const { error: metricsError } = await supabaseAdmin
      .from('chat_metrics')
      .select('id')
      .limit(1);

    // If any table doesn't exist, we need to create them
    if (sessionsError?.code === 'PGRST116' || 
        messagesError?.code === 'PGRST116' || 
        metricsError?.code === 'PGRST116') {
      
      console.log('Some tables are missing. Please run the database setup script.');
      console.log('Run: npm run db:setup');
      return false;
    }

    console.log('All required tables exist');
    return true;
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
}

/**
 * Chat Sessions Operations
 */
const chatSessions = {
  /**
   * Create a new chat session
   * @param {string} userId - User ID
   * @param {string} sessionId - Unique session ID
   * @param {Object} metadata - Additional session metadata
   * @returns {Promise<Object>} Created session data
   */
  async create(userId, sessionId, metadata = {}) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: metadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    return data;
  },

  /**
   * Get a chat session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session data or null if not found
   */
  async getById(sessionId) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get chat session: ${error.message}`);
    }

    return data;
  },

  /**
   * Update a chat session
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated session data
   */
  async update(sessionId, updates) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update chat session: ${error.message}`);
    }

    return data;
  },

  /**
   * Get sessions for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of sessions to return
   * @returns {Promise<Array>} Array of session data
   */
  async getByUserId(userId, limit = 50) {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get user sessions: ${error.message}`);
    }

    return data || [];
  }
};

/**
 * Chat Messages Operations
 */
const chatMessages = {
  /**
   * Add a message to a chat session
   * @param {string} sessionId - Session ID
   * @param {string} role - Message role (user, assistant, system)
   * @param {string} content - Message content
   * @param {Object} metadata - Additional message metadata
   * @returns {Promise<Object>} Created message data
   */
  async add(sessionId, role, content, metadata = {}) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: role,
        content: content,
        created_at: new Date().toISOString(),
        metadata: metadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add chat message: ${error.message}`);
    }

    return data;
  },

  /**
   * Get messages for a chat session
   * @param {string} sessionId - Session ID
   * @param {number} limit - Maximum number of messages to return
   * @returns {Promise<Array>} Array of message data
   */
  async getBySessionId(sessionId, limit = 100) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get chat messages: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Delete messages for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} True if successful
   */
  async deleteBySessionId(sessionId) {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      throw new Error(`Failed to delete chat messages: ${error.message}`);
    }

    return true;
  }
};

/**
 * Chat Metrics Operations
 */
const chatMetrics = {
  /**
   * Record chat metrics
   * @param {string} sessionId - Session ID
   * @param {string} model - Model used
   * @param {number} responseTime - Response time in milliseconds
   * @param {number} tokenCount - Number of tokens used
   * @param {Object} metadata - Additional metrics metadata
   * @returns {Promise<Object>} Created metrics data
   */
  async record(sessionId, model, responseTime, tokenCount, metadata = {}) {
    const { data, error } = await supabase
      .from('chat_metrics')
      .insert({
        session_id: sessionId,
        model: model,
        response_time_ms: responseTime,
        token_count: tokenCount,
        created_at: new Date().toISOString(),
        metadata: metadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record chat metrics: ${error.message}`);
    }

    return data;
  },

  /**
   * Get aggregated metrics
   * @param {string} timeframe - Timeframe for metrics (hour, day, week, month)
   * @returns {Promise<Object>} Aggregated metrics data
   */
  async getAggregated(timeframe = 'day') {
    let interval;
    switch (timeframe) {
      case 'hour':
        interval = '1 hour';
        break;
      case 'week':
        interval = '7 days';
        break;
      case 'month':
        interval = '30 days';
        break;
      default:
        interval = '1 day';
    }

    const { data, error } = await supabase
      .from('chat_metrics')
      .select('*')
      .gte('created_at', new Date(Date.now() - (timeframe === 'hour' ? 3600000 : timeframe === 'week' ? 604800000 : timeframe === 'month' ? 2592000000 : 86400000)).toISOString());

    if (error) {
      throw new Error(`Failed to get aggregated metrics: ${error.message}`);
    }

    // Calculate aggregations
    const metrics = data || [];
    const totalRequests = metrics.length;
    const avgResponseTime = totalRequests > 0 
      ? Math.round(metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / totalRequests)
      : 0;
    const totalTokens = metrics.reduce((sum, m) => sum + m.token_count, 0);

    return {
      totalRequests,
      avgResponseTime,
      totalTokens,
      timeframe
    };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  initializeTables,
  chatSessions,
  chatMessages,
  chatMetrics
};