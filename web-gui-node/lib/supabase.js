/**
 * Supabase Client Configuration with Enhanced Security
 * Provides database connection and utility functions for DinoAir
 */

const { createClient } = require('@supabase/supabase-js');
const SecretsManager = require('../../lib/secrets-manager');
require('dotenv').config();

// Initialize secrets manager
const secretsManager = new SecretsManager();

// Validate environment variables with security checks
async function validateSupabaseConfig() {
  const supabaseUrl = await secretsManager.getSecret('SUPABASE_URL');
  const supabaseAnonKey = await secretsManager.getSecret('SUPABASE_ANON_KEY');
  const supabaseServiceKey = await secretsManager.getSecret('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }

  // Validate URL format
  try {
    const parsedUrl = new URL(supabaseUrl);
    if (!parsedUrl.hostname.endsWith('.supabase.co')) {
      console.warn('⚠️  SUPABASE_URL format appears invalid or uses example value');
    }
  } catch (error) {
    throw new Error('SUPABASE_URL is not a valid URL');
  }

  // Check for weak secrets
  if (secretsManager.isWeakSecret(supabaseUrl) || secretsManager.isWeakSecret(supabaseAnonKey)) {
    console.warn('⚠️  Supabase configuration contains weak or example values');
    console.warn('   Please update with real credentials for production use');
  }

  // Warn about missing service role key if in production
  if (process.env.NODE_ENV === 'production' && !supabaseServiceKey) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not configured for production environment');
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

// Initialize clients with validated configuration
let supabase = null;
let supabaseAdmin = null;

async function initializeClients() {
  try {
    const config = await validateSupabaseConfig();
    
    // Create Supabase client with anonymous key (for public operations)
    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    });

    // Create Supabase client with service role key (for admin operations)
    if (config.supabaseServiceKey) {
      supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } else {
      console.warn('⚠️  Admin client not available - SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    console.log('✅ Supabase clients initialized successfully');
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('❌ Configuration error during Supabase initialization:', error.message);
    } else {
      console.error('❌ Connection error during Supabase initialization:', error.message);
    }
    throw error;
  }
}

// Initialize clients on module load
initializeClients().catch(error => {
  if (error instanceof ConfigurationError) {
    console.error('Fatal configuration error initializing Supabase:', error.message);
  } else {
    console.error('Fatal connection error initializing Supabase:', error.message);
  }
  process.exit(1);
});

/**
 * Test database connectivity
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection() {
  try {
    const { data, error } = await supabase.from('chat_sessions').select('count', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist
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
    const { error: sessionsError } = await supabaseAdmin.from('chat_sessions').select('id').limit(1);

    const { error: messagesError } = await supabaseAdmin.from('chat_messages').select('id').limit(1);

    const { error: metricsError } = await supabaseAdmin.from('chat_metrics').select('id').limit(1);

    // If any table doesn't exist, we need to create them
    if (sessionsError?.code === 'PGRST116' || messagesError?.code === 'PGRST116' || metricsError?.code === 'PGRST116') {
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
        metadata
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
    const { data, error } = await supabase.from('chat_sessions').select('*').eq('id', sessionId).single();

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
        role,
        content,
        created_at: new Date().toISOString(),
        metadata
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
    const { error } = await supabase.from('chat_messages').delete().eq('session_id', sessionId);

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
        model,
        response_time_ms: responseTime,
        token_count: tokenCount,
        created_at: new Date().toISOString(),
        metadata
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
      .gte(
        'created_at',
        new Date(
          Date.now() -
            (timeframe === 'hour'
              ? 3600000
              : timeframe === 'week'
                ? 604800000
                : timeframe === 'month'
                  ? 2592000000
                  : 86400000)
        ).toISOString()
      );

    if (error) {
      throw new Error(`Failed to get aggregated metrics: ${error.message}`);
    }

    // Calculate aggregations
    const metrics = data || [];
    const totalRequests = metrics.length;
    const avgResponseTime =
      totalRequests > 0 ? Math.round(metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / totalRequests) : 0;
    const totalTokens = metrics.reduce((sum, m) => sum + m.token_count, 0);

    return {
      totalRequests,
      avgResponseTime,
      totalTokens,
      timeframe
    };
  },

  /**
   * Get advanced chat analytics with detailed metrics
   * @param {string} timeframe - Timeframe for analytics (1h, 24h, 7d, 30d, 90d)
   * @param {string} granularity - Data granularity (hour, day, week, month)
   * @returns {Promise<Object>} Advanced analytics data
   */
  async getAdvancedAnalytics(timeframe = '7d', granularity = 'hour') {
    try {
      const timeMap = {
        '1h': 3600000,
        '24h': 86400000,
        '7d': 604800000,
        '30d': 2592000000,
        '90d': 7776000000
      };

      const timeOffset = timeMap[timeframe] || 604800000;

      const { data, error } = await supabase
        .from('chat_metrics')
        .select('*')
        .gte('created_at', new Date(Date.now() - timeOffset).toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to get advanced chat analytics: ${error.message}`);
      }

      const metrics = data || [];
      const responseTimes = metrics.map(m => m.response_time_ms || 0).filter(rt => rt > 0);
      const sortedResponseTimes = responseTimes.sort((a, b) => a - b);

      const uniqueSessions = [...new Set(metrics.map(m => m.session_id))];

      const analytics = {
        totalSessions: uniqueSessions.length,
        totalMessages: metrics.length,
        averageSessionDuration: 0, // Would need session start/end times
        averageMessagesPerSession: metrics.length / uniqueSessions.length || 0,
        responseTimeMetrics: {
          avg: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length || 0,
          min: Math.min(...responseTimes) || 0,
          max: Math.max(...responseTimes) || 0,
          p50: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.5)] || 0,
          p95: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)] || 0,
          p99: sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)] || 0
        },
        popularModels: Object.entries(
          metrics.reduce((acc, m) => {
            const model = m.model || 'unknown';
            acc[model] = (acc[model] || 0) + 1;
            return acc;
          }, {})
        )
          .map(([model, usage]) => ({
            model,
            usage,
            percentage: (usage / metrics.length) * 100
          }))
          .sort((a, b) => b.usage - a.usage),
        hourlyActivity: this.getTimeSeriesData(metrics, 'hour'),
        dailyActivity: this.getTimeSeriesData(metrics, 'day'),
        weeklyActivity: this.getTimeSeriesData(metrics, 'week'),
        monthlyActivity: this.getTimeSeriesData(metrics, 'month'),
        errorRate: 0, // Would need success/error tracking
        successRate: 100 // Would need success/error tracking
      };

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get advanced chat analytics: ${error.message}`);
    }
  },

  /**
   * Get time series data for charts
   * @param {Array} data - Raw metrics data
   * @param {string} granularity - Time granularity (hour, day, week, month)
   * @returns {Array} Time series data points
   */
  getTimeSeriesData(data, granularity) {
    const groupBy = {
      hour: date => date.toISOString().slice(0, 13) + ':00:00.000Z',
      day: date => date.toISOString().slice(0, 10) + 'T00:00:00.000Z',
      week: date => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().slice(0, 10) + 'T00:00:00.000Z';
      },
      month: date => date.toISOString().slice(0, 7) + '-01T00:00:00.000Z'
    };

    const grouped = data.reduce((acc, item) => {
      const key = groupBy[granularity](new Date(item.created_at));
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([timestamp, items]) => ({
        timestamp,
        value: items.length,
        label: new Date(timestamp).toLocaleDateString()
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  },

  /**
   * Get user behavior analytics
   * @param {string} timeframe - Timeframe for analytics
   * @returns {Promise<Object>} User behavior analytics
   */
  async getUserBehaviorAnalytics(timeframe = '30d') {
    try {
      const timeMap = {
        '7d': 604800000,
        '30d': 2592000000,
        '90d': 7776000000
      };

      const timeOffset = timeMap[timeframe] || 2592000000;

      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .gte('created_at', new Date(Date.now() - timeOffset).toISOString());

      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .gte('created_at', new Date(Date.now() - timeOffset).toISOString());

      if (sessionsError || messagesError) {
        throw new Error(`Failed to get user behavior analytics: ${sessionsError?.message || messagesError?.message}`);
      }

      const sessionsData = sessions || [];
      const messagesData = messages || [];
      const uniqueUsers = new Set(sessionsData.map(s => s.user_id)).size;
      const totalSessions = sessionsData.length;
      const totalMessages = messagesData.length;

      const hourlyActivity = Array.from({ length: 24 }, (_, hour) => {
        const hourMessages = messagesData.filter(m => new Date(m.created_at).getHours() === hour);
        return {
          hour,
          activity: hourMessages.length
        };
      });

      const dailyActivity = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
        (day, index) => {
          const dayMessages = messagesData.filter(m => new Date(m.created_at).getDay() === index);
          return {
            day,
            activity: dayMessages.length
          };
        }
      );

      const analytics = {
        totalUsers: uniqueUsers,
        activeUsers: {
          daily: uniqueUsers, // Simplified - would need daily tracking
          weekly: uniqueUsers,
          monthly: uniqueUsers
        },
        userEngagement: {
          averageSessionsPerUser: totalSessions / uniqueUsers || 0,
          averageSessionDuration: 0, // Would need session duration tracking
          retentionRate: {
            day1: 0.8, // Placeholder - would need retention tracking
            day7: 0.6,
            day30: 0.4
          }
        },
        userBehavior: {
          mostActiveHours: hourlyActivity.sort((a, b) => b.activity - a.activity),
          mostActiveDays: dailyActivity.sort((a, b) => b.activity - a.activity),
          featureUsage: [
            { feature: 'Chat', usage: totalMessages, percentage: 100 },
            { feature: 'Image Generation', usage: 0, percentage: 0 }
          ]
        },
        geographicDistribution: [{ region: 'Unknown', users: uniqueUsers, percentage: 100 }]
      };

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get user behavior analytics: ${error.message}`);
    }
  }
};

/**
 * Artifacts Operations
 */
const artifacts = {
  /**
   * Create a new artifact
   * @param {Object} artifactData - Artifact data
   * @param {string} artifactData.name - Artifact name
   * @param {string} artifactData.type - Artifact type
   * @param {string} artifactData.content - Artifact content
   * @param {string} [artifactData.user_id] - User ID (optional for public artifacts)
   * @param {string[]} [artifactData.tags] - Tags array
   * @param {Object} [artifactData.metadata] - Additional metadata
   * @returns {Promise<Object>} Created artifact data
   */
  async create(artifactData) {
    const size = Buffer.byteLength(artifactData.content, 'utf8');

    const { data, error } = await supabase
      .from('artifacts')
      .insert({
        name: artifactData.name,
        type: artifactData.type,
        content: artifactData.content,
        size,
        user_id: artifactData.user_id || null,
        tags: artifactData.tags || [],
        metadata: artifactData.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create artifact: ${error.message}`);
    }

    return data;
  },

  /**
   * Get artifact by ID
   * @param {string} id - Artifact ID
   * @returns {Promise<Object|null>} Artifact data or null if not found
   */
  async getById(id) {
    const { data, error } = await supabase.from('artifacts').select('*').eq('id', id).single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get artifact: ${error.message}`);
    }

    return data;
  },

  /**
   * Get all artifacts with optional filtering
   * @param {Object} options - Query options
   * @param {string} [options.user_id] - Filter by user ID
   * @param {string} [options.type] - Filter by type
   * @param {string[]} [options.tags] - Filter by tags
   * @param {number} [options.limit] - Limit results
   * @param {number} [options.offset] - Offset for pagination
   * @param {string} [options.search] - Search in name and content
   * @returns {Promise<Array>} Array of artifacts
   */
  async getAll(options = {}) {
    let query = supabase.from('artifacts').select('*');

    // Apply filters
    if (options.user_id !== undefined) {
      if (options.user_id === null) {
        query = query.is('user_id', null);
      } else {
        query = query.eq('user_id', options.user_id);
      }
    }

    if (options.type) {
      query = query.eq('type', options.type);
    }

    if (options.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }

    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,content.ilike.%${options.search}%`);
    }

    // Apply ordering
    query = query.order('updated_at', { ascending: false });

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get artifacts: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Update an artifact
   * @param {string} id - Artifact ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated artifact data
   */
  async update(id, updates) {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Recalculate size if content is updated
    if (updates.content) {
      updateData.size = Buffer.byteLength(updates.content, 'utf8');
    }

    const { data, error } = await supabase.from('artifacts').update(updateData).eq('id', id).select().single();

    if (error) {
      throw new Error(`Failed to update artifact: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new version of an artifact
   * @param {string} parentId - Parent artifact ID
   * @param {Object} artifactData - New version data
   * @returns {Promise<Object>} Created artifact version
   */
  async createVersion(parentId, artifactData) {
    // Get parent artifact to inherit properties
    const parent = await this.getById(parentId);
    if (!parent) {
      throw new Error('Parent artifact not found');
    }

    const size = Buffer.byteLength(artifactData.content, 'utf8');
    const newVersion = parent.version + 1;

    const { data, error } = await supabase
      .from('artifacts')
      .insert({
        name: artifactData.name || parent.name,
        type: artifactData.type || parent.type,
        content: artifactData.content,
        size,
        user_id: parent.user_id,
        version: newVersion,
        parent_id: parentId,
        tags: artifactData.tags || parent.tags,
        metadata: { ...parent.metadata, ...artifactData.metadata },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create artifact version: ${error.message}`);
    }

    return data;
  },

  /**
   * Get all versions of an artifact
   * @param {string} artifactId - Artifact ID (can be any version)
   * @returns {Promise<Array>} Array of artifact versions
   */
  async getVersions(artifactId) {
    // First, get the artifact to determine if it's a parent or child
    const artifact = await this.getById(artifactId);
    if (!artifact) {
      throw new Error('Artifact not found');
    }

    // Find the root parent
    const rootId = artifact.parent_id || artifactId;

    // Get all versions (root + all children)
    const { data, error } = await supabase
      .from('artifacts')
      .select('*')
      .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
      .order('version', { ascending: true });

    if (error) {
      throw new Error(`Failed to get artifact versions: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Delete an artifact
   * @param {string} id - Artifact ID
   * @returns {Promise<boolean>} True if successful
   */
  async delete(id) {
    const { error } = await supabase.from('artifacts').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete artifact: ${error.message}`);
    }

    return true;
  },

  /**
   * Get artifacts count and total size for a user
   * @param {string} [userId] - User ID (null for public artifacts)
   * @returns {Promise<Object>} Count and size statistics
   */
  async getStats(userId = null) {
    let query = supabase.from('artifacts').select('size');

    if (userId === null) {
      query = query.is('user_id', null);
    } else {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get artifact stats: ${error.message}`);
    }

    const artifacts = data || [];
    const count = artifacts.length;
    const totalSize = artifacts.reduce((sum, artifact) => sum + artifact.size, 0);

    return { count, totalSize };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  initializeTables,
  chatSessions,
  chatMessages,
  chatMetrics,
  artifacts
};
