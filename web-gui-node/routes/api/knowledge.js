/**
 * Knowledge Base API Routes
 * Provides endpoints for knowledge extraction, search, and memory management
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { requireAuth } = require('../../middleware/auth-middleware');
const { rateLimits } = require('../../middleware/validation');
const { knowledgeStore, memorySystem, extractKnowledge } = require('../../lib/knowledge-base');

const router = express.Router();

/**
 * Input validation middleware
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * POST /api/knowledge/extract
 * Extract knowledge from text input
 */
router.post('/extract',
  requireAuth,
  rateLimits.api,
  [
    body('text').isString().isLength({ min: 10, max: 10000 })
      .withMessage('Text must be between 10 and 10000 characters'),
    body('context').optional().isObject()
      .withMessage('Context must be an object'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { text, context = {} } = req.body;
      const userId = req.user?.id || req.user?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      // Extract knowledge from the text
      const knowledge = extractKnowledge(text, context);
      
      // Store the knowledge if significant content was found
      let stored = null;
      if (knowledge.entities.length > 0 || knowledge.facts.length > 0) {
        stored = await knowledgeStore.store(
          userId,
          context.session_id || null,
          context.message_id || null,
          knowledge
        );
      }

      res.json({
        success: true,
        knowledge: {
          entities: knowledge.entities,
          facts: knowledge.facts,
          relationships: knowledge.relationships,
          entity_count: knowledge.entities.length,
          fact_count: knowledge.facts.length,
          relationship_count: knowledge.relationships.length
        },
        stored: stored ? true : false,
        stored_id: stored?.id || null
      });

    } catch (error) {
      console.error('Knowledge extraction error:', error);
      res.status(500).json({
        error: 'Failed to extract knowledge',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/knowledge/search
 * Search knowledge base using semantic similarity
 */
router.get('/search',
  requireAuth,
  rateLimits.api,
  [
    query('q').isString().isLength({ min: 3, max: 500 })
      .withMessage('Query must be between 3 and 500 characters')
      .escape(),
    query('limit').optional().isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
    query('threshold').optional().isFloat({ min: 0, max: 1 })
      .withMessage('Threshold must be between 0 and 1'),
    query('include_public').optional().isBoolean()
      .withMessage('include_public must be a boolean'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.sub;
      const { 
        q: query, 
        limit = 10, 
        threshold = 0.3, 
        include_public = false 
      } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      // Search the knowledge base
      const results = await knowledgeStore.search(userId, query, {
        limit: parseInt(limit),
        threshold: parseFloat(threshold),
        includePublic: include_public === 'true'
      });

      // Log the search for analytics
      try {
        const { supabase } = require('../../lib/supabase');
        await supabase
          .from('knowledge_search_history')
          .insert({
            user_id: userId,
            query,
            results_count: results.length,
            search_type: 'semantic'
          });
      } catch (logError) {
        console.warn('Failed to log search:', logError.message);
      }

      res.json({
        query,
        results: results.map(result => ({
          id: result.id,
          content: result.content,
          similarity: result.similarity,
          entities: result.entities,
          facts: result.facts,
          created_at: result.created_at,
          session_id: result.session_id
        })),
        count: results.length,
        search_params: {
          limit: parseInt(limit),
          threshold: parseFloat(threshold),
          include_public
        }
      });

    } catch (error) {
      console.error('Knowledge search error:', error);
      res.status(500).json({
        error: 'Failed to search knowledge base',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/knowledge/memories
 * Get relevant memories for a query or context
 */
router.get('/memories',
  requireAuth,
  rateLimits.api,
  [
    query('context').isString().isLength({ min: 3, max: 500 })
      .withMessage('Context must be between 3 and 500 characters'),
    query('max_memories').optional().isInt({ min: 1, max: 10 })
      .withMessage('max_memories must be between 1 and 10'),
    query('include_recent').optional().isBoolean()
      .withMessage('include_recent must be a boolean'),
    query('min_similarity').optional().isFloat({ min: 0, max: 1 })
      .withMessage('min_similarity must be between 0 and 1'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.sub;
      const { 
        context,
        max_memories = 5,
        include_recent = true,
        min_similarity = 0.4
      } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      // Get relevant memories
      const memories = await memorySystem.getRelevantMemories(userId, context, {
        maxMemories: parseInt(max_memories),
        includeRecent: include_recent === 'true',
        minSimilarity: parseFloat(min_similarity)
      });

      res.json({
        context,
        memories: {
          similar: memories.similar.map(mem => ({
            id: mem.id,
            content: mem.content,
            similarity: mem.similarity,
            facts: mem.facts,
            entities: mem.entities,
            created_at: mem.created_at
          })),
          recent: memories.recent.map(mem => ({
            id: mem.id,
            content: mem.content,
            facts: mem.facts,
            entities: mem.entities,
            created_at: mem.created_at
          }))
        },
        total_found: memories.total_found,
        search_params: {
          max_memories: parseInt(max_memories),
          include_recent,
          min_similarity: parseFloat(min_similarity)
        }
      });

    } catch (error) {
      console.error('Memory retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve memories',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/knowledge/summary
 * Get user's knowledge base summary and statistics
 */
router.get('/summary',
  requireAuth,
  rateLimits.api,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      // Get memory summary
      const summary = await knowledgeStore.getMemorySummary(userId);

      res.json({
        user_id: userId,
        summary,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Summary generation error:', error);
      res.status(500).json({
        error: 'Failed to generate summary',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/knowledge/settings
 * Get user's memory and privacy settings
 */
router.get('/settings',
  requireAuth,
  rateLimits.api,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      const { supabase } = require('../../lib/supabase');
      
      // Get user settings or create default
      let { data: settings, error } = await supabase
        .from('user_memory_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('user_memory_settings')
          .insert({
            user_id: userId,
            memory_enabled: true,
            retention_days: null,
            share_anonymized: false,
            auto_extract: true
          })
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        settings = newSettings;
      } else if (error) {
        throw error;
      }

      res.json({
        settings: {
          memory_enabled: settings.memory_enabled,
          retention_days: settings.retention_days,
          share_anonymized: settings.share_anonymized,
          auto_extract: settings.auto_extract,
          updated_at: settings.updated_at
        }
      });

    } catch (error) {
      console.error('Settings retrieval error:', error);
      res.status(500).json({
        error: 'Failed to retrieve settings',
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/knowledge/settings
 * Update user's memory and privacy settings
 */
router.put('/settings',
  requireAuth,
  rateLimits.api,
  [
    body('memory_enabled').optional().isBoolean()
      .withMessage('memory_enabled must be a boolean'),
    body('retention_days').optional().isInt({ min: 1, max: 3650 })
      .withMessage('retention_days must be between 1 and 3650 days'),
    body('share_anonymized').optional().isBoolean()
      .withMessage('share_anonymized must be a boolean'),
    body('auto_extract').optional().isBoolean()
      .withMessage('auto_extract must be a boolean'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.sub;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      const { supabase } = require('../../lib/supabase');

      // Update settings
      const { data: settings, error } = await supabase
        .from('user_memory_settings')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        settings: {
          memory_enabled: settings.memory_enabled,
          retention_days: settings.retention_days,
          share_anonymized: settings.share_anonymized,
          auto_extract: settings.auto_extract,
          updated_at: settings.updated_at
        }
      });

    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({
        error: 'Failed to update settings',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/knowledge/memories
 * Delete user's memories (privacy control)
 */
router.delete('/memories',
  requireAuth,
  rateLimits.api,
  [
    query('before_date').optional().isISO8601()
      .withMessage('before_date must be a valid ISO8601 date'),
    query('confirm').isIn(['true'])
      .withMessage('confirm=true parameter is required for safety'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.sub;
      const { before_date } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      // Delete memories
      const success = await knowledgeStore.deleteUserKnowledge(userId, {
        beforeDate: before_date || undefined
      });

      if (!success) {
        return res.status(500).json({
          error: 'Failed to delete memories'
        });
      }

      res.json({
        success: true,
        message: before_date 
          ? `Memories before ${before_date} have been deleted`
          : 'All memories have been deleted',
        deleted_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Memory deletion error:', error);
      res.status(500).json({
        error: 'Failed to delete memories',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/knowledge/context
 * Generate memory context for a given input (used by chat system)
 */
router.post('/context',
  requireAuth,
  rateLimits.chat, // Use chat rate limit since this is used by chat
  [
    body('message').isString().isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
  ],
  validateRequest,
  async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.sub;
      const { message } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User ID not found in token' });
      }

      // Generate memory context
      const context = await memorySystem.generateMemoryContext(userId, message);

      res.json({
        has_context: context !== null,
        context: context,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Context generation error:', error);
      res.status(500).json({
        error: 'Failed to generate context',
        message: error.message
      });
    }
  }
);

module.exports = router;