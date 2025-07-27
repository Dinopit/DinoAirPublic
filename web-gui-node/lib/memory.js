/**
 * Memory Management Module for DinoAir
 * Provides per-user memory/history storage and retrieval using Supabase
 *
 * Table structure:
 * - id: UUID (primary key)
 * - user_id: string (required)
 * - memory_data: JSON or text
 * - updated_at: timestamp
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

// Create Supabase client
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

/**
 * Save or update memory data for a user (upsert operation)
 * @param {string} userId - The user ID to store memory for
 * @param {Object|string} data - The memory data to store (will be JSON stringified if object)
 * @returns {Promise<Object>} The saved memory record
 * @throws {Error} If the operation fails
 *
 * @example
 * // Save object data
 * const result = await saveMemory('user123', {
 *   preferences: { theme: 'dark' },
 *   lastAction: 'chat_sent'
 * });
 *
 * // Save string data
 * const result = await saveMemory('user123', 'Simple text memory');
 */
async function saveMemory(userId, data) {
  try {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId must be a non-empty string');
    }

    if (data === null || data === undefined) {
      throw new Error('data cannot be null or undefined');
    }

    // Prepare memory data - convert objects to JSON string, keep strings as-is
    let memoryData;
    if (typeof data === 'object') {
      try {
        memoryData = JSON.stringify(data);
      } catch (jsonError) {
        throw new Error(`Failed to serialize data to JSON: ${jsonError.message}`);
      }
    } else {
      memoryData = String(data);
    }

    const now = new Date().toISOString();

    // Perform upsert operation
    const { data: result, error } = await supabase
      .from('memory')
      .upsert(
        {
          user_id: userId,
          memory_data: memoryData,
          updated_at: now
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save memory for user ${userId}: ${error.message}`);
    }

    return result;
  } catch (error) {
    // Re-throw with additional context if it's not already our custom error
    if (error.message.startsWith('Failed to save memory')
        || error.message.startsWith('userId must be')
        || error.message.startsWith('data cannot be')
        || error.message.startsWith('Failed to serialize')) {
      throw error;
    }
    throw new Error(`Unexpected error saving memory: ${error.message}`);
  }
}

/**
 * Retrieve memory data for a user
 * @param {string} userId - The user ID to retrieve memory for
 * @returns {Promise<Object|null>} The memory data object or null if not found
 * @throws {Error} If the operation fails
 *
 * @example
 * // Retrieve memory data
 * const memory = await getMemory('user123');
 * if (memory) {
 *   console.log('User memory:', memory.memory_data);
 *   console.log('Last updated:', memory.updated_at);
 * } else {
 *   console.log('No memory found for user');
 * }
 */
async function getMemory(userId) {
  try {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId must be a non-empty string');
    }

    // Query the memory table
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Handle "not found" case gracefully
    if (error && error.code === 'PGRST116') {
      return null;
    }

    if (error) {
      throw new Error(`Failed to retrieve memory for user ${userId}: ${error.message}`);
    }

    // Try to parse JSON data if it looks like JSON
    if (data && data.memory_data) {
      try {
        // Check if the data looks like JSON (starts with { or [)
        const trimmedData = data.memory_data.trim();
        if (trimmedData.startsWith('{') || trimmedData.startsWith('[')) {
          data.memory_data = JSON.parse(data.memory_data);
        }
      } catch (parseError) {
        // If JSON parsing fails, keep the data as string
        // This allows for both JSON and plain text storage
      }
    }

    return data;
  } catch (error) {
    // Re-throw with additional context if it's not already our custom error
    if (error.message.startsWith('Failed to retrieve memory')
        || error.message.startsWith('userId must be')) {
      throw error;
    }
    throw new Error(`Unexpected error retrieving memory: ${error.message}`);
  }
}

/**
 * Delete memory data for a user
 * @param {string} userId - The user ID to delete memory for
 * @returns {Promise<boolean>} True if memory was deleted, false if no memory existed
 * @throws {Error} If the operation fails
 *
 * @example
 * const deleted = await deleteMemory('user123');
 * if (deleted) {
 *   console.log('Memory deleted successfully');
 * } else {
 *   console.log('No memory found to delete');
 * }
 */
async function deleteMemory(userId) {
  try {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId must be a non-empty string');
    }

    // Delete the memory record
    const { data, error } = await supabase
      .from('memory')
      .delete()
      .eq('user_id', userId)
      .select();

    if (error) {
      throw new Error(`Failed to delete memory for user ${userId}: ${error.message}`);
    }

    // Return true if a record was deleted, false if no record existed
    return data && data.length > 0;
  } catch (error) {
    // Re-throw with additional context if it's not already our custom error
    if (error.message.startsWith('Failed to delete memory')
        || error.message.startsWith('userId must be')) {
      throw error;
    }
    throw new Error(`Unexpected error deleting memory: ${error.message}`);
  }
}

/**
 * Check if memory exists for a user
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} True if memory exists, false otherwise
 * @throws {Error} If the operation fails
 *
 * @example
 * const exists = await hasMemory('user123');
 * if (exists) {
 *   console.log('User has stored memory');
 * } else {
 *   console.log('No memory found for user');
 * }
 */
async function hasMemory(userId) {
  try {
    // Validate input parameters
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId must be a non-empty string');
    }

    // Check if memory exists (count query is more efficient)
    const { count, error } = await supabase
      .from('memory')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to check memory existence for user ${userId}: ${error.message}`);
    }

    return count > 0;
  } catch (error) {
    // Re-throw with additional context if it's not already our custom error
    if (error.message.startsWith('Failed to check memory')
        || error.message.startsWith('userId must be')) {
      throw error;
    }
    throw new Error(`Unexpected error checking memory existence: ${error.message}`);
  }
}

/**
 * Get memory data for multiple users
 * @param {string[]} userIds - Array of user IDs to retrieve memory for
 * @returns {Promise<Object[]>} Array of memory records
 * @throws {Error} If the operation fails
 *
 * @example
 * const memories = await getMultipleMemories(['user1', 'user2', 'user3']);
 * memories.forEach(memory => {
 *   console.log(`User ${memory.user_id}:`, memory.memory_data);
 * });
 */
async function getMultipleMemories(userIds) {
  try {
    // Validate input parameters
    if (!Array.isArray(userIds)) {
      throw new Error('userIds must be an array');
    }

    if (userIds.length === 0) {
      return [];
    }

    // Validate all user IDs are strings
    for (const userId of userIds) {
      if (!userId || typeof userId !== 'string') {
        throw new Error('All userIds must be non-empty strings');
      }
    }

    // Query multiple users at once
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .in('user_id', userIds);

    if (error) {
      throw new Error(`Failed to retrieve memories for users: ${error.message}`);
    }

    // Parse JSON data for each record
    const results = (data || []).map(record => {
      if (record.memory_data) {
        try {
          const trimmedData = record.memory_data.trim();
          if (trimmedData.startsWith('{') || trimmedData.startsWith('[')) {
            record.memory_data = JSON.parse(record.memory_data);
          }
        } catch (parseError) {
          // Keep as string if JSON parsing fails
        }
      }
      return record;
    });

    return results;
  } catch (error) {
    // Re-throw with additional context if it's not already our custom error
    if (error.message.startsWith('Failed to retrieve memories')
        || error.message.startsWith('userIds must be')
        || error.message.startsWith('All userIds must be')) {
      throw error;
    }
    throw new Error(`Unexpected error retrieving multiple memories: ${error.message}`);
  }
}

// Export the functions for use in other modules
module.exports = {
  saveMemory,
  getMemory,
  deleteMemory,
  hasMemory,
  getMultipleMemories
};
