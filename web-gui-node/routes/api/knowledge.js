/**
 * Knowledge API Routes
 * RESTful API for knowledge base management and retrieval
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

// Mock authentication middleware for simple testing
const authenticateRequest = (req, res, next) => {
  // In a real implementation, this would validate JWT tokens, API keys, etc.
  req.user = req.user || { id: 'anonymous', name: 'Anonymous User' };
  next();
};

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Validation middleware
const validateKnowledgeQuery = [
  body('query')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Query is required and must not exceed 1000 characters'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  body('options.limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const validateKnowledgeEntry = [
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must not exceed 200 characters'),
  body('content')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content is required and must not exceed 10KB'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must not exceed 100 characters')
];

const validateKnowledgeId = [
  param('knowledgeId')
    .isUUID()
    .withMessage('Knowledge ID must be a valid UUID')
];

// Mock knowledge service (in a real implementation, this would be a proper service)
class KnowledgeService {
  constructor() {
    this.knowledgeBase = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Getting Started with DinoAir',
        content: 'DinoAir is a comprehensive AI platform that provides access to multiple AI models, code execution capabilities, and knowledge management features.',
        tags: ['getting-started', 'overview'],
        category: 'documentation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Code Execution Guidelines',
        content: 'When using the code execution feature, ensure your code is properly formatted and follows security best practices. The system supports multiple programming languages including Python, JavaScript, and more.',
        tags: ['code-execution', 'guidelines', 'security'],
        category: 'documentation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  searchKnowledge(query, options = {}) {
    const limit = options.limit || 10;
    const filtered = this.knowledgeBase.filter(entry => 
      entry.title.toLowerCase().includes(query.toLowerCase()) ||
      entry.content.toLowerCase().includes(query.toLowerCase()) ||
      (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
    
    return {
      results: filtered.slice(0, limit),
      total: filtered.length,
      query,
      timestamp: new Date().toISOString()
    };
  }

  getKnowledgeEntry(id) {
    return this.knowledgeBase.find(entry => entry.id === id);
  }

  createKnowledgeEntry(data) {
    const entry = {
      id: this.generateUUID(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.knowledgeBase.push(entry);
    return entry;
  }

  updateKnowledgeEntry(id, data) {
    const index = this.knowledgeBase.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error('Knowledge entry not found');
    }
    
    this.knowledgeBase[index] = {
      ...this.knowledgeBase[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    return this.knowledgeBase[index];
  }

  deleteKnowledgeEntry(id) {
    const index = this.knowledgeBase.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error('Knowledge entry not found');
    }
    
    return this.knowledgeBase.splice(index, 1)[0];
  }

  getCategories() {
    const categories = [...new Set(this.knowledgeBase.map(entry => entry.category).filter(Boolean))];
    return categories;
  }

  getTags() {
    const allTags = this.knowledgeBase.flatMap(entry => entry.tags || []);
    const uniqueTags = [...new Set(allTags)];
    return uniqueTags;
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Initialize knowledge service
const knowledgeService = new KnowledgeService();

/**
 * POST /api/knowledge/search
 * Search knowledge base
 */
router.post('/search',
  authenticateRequest,
  validateKnowledgeQuery,
  handleValidationErrors,
  (req, res) => {
    try {
      const { query, options = {} } = req.body;
      const results = knowledgeService.searchKnowledge(query, options);
      
      res.json({
        success: true,
        ...results
      });
    } catch (error) {
      console.error('Knowledge search error:', error);
      res.status(500).json({
        error: 'Knowledge search failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/knowledge/entries
 * Get all knowledge entries
 */
router.get('/entries', authenticateRequest, (req, res) => {
  try {
    const { category, tag, limit = 50 } = req.query;
    let entries = knowledgeService.knowledgeBase;
    
    if (category) {
      entries = entries.filter(entry => entry.category === category);
    }
    
    if (tag) {
      entries = entries.filter(entry => entry.tags && entry.tags.includes(tag));
    }
    
    res.json({
      success: true,
      entries: entries.slice(0, parseInt(limit)),
      total: entries.length
    });
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({
      error: 'Failed to get knowledge entries',
      message: error.message
    });
  }
});

/**
 * GET /api/knowledge/entries/:knowledgeId
 * Get specific knowledge entry
 */
router.get('/entries/:knowledgeId',
  authenticateRequest,
  validateKnowledgeId,
  handleValidationErrors,
  (req, res) => {
    try {
      const { knowledgeId } = req.params;
      const entry = knowledgeService.getKnowledgeEntry(knowledgeId);
      
      if (!entry) {
        return res.status(404).json({
          error: 'Knowledge entry not found'
        });
      }
      
      res.json({
        success: true,
        entry
      });
    } catch (error) {
      console.error('Get entry error:', error);
      res.status(500).json({
        error: 'Failed to get knowledge entry',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/knowledge/entries
 * Create new knowledge entry
 */
router.post('/entries',
  authenticateRequest,
  validateKnowledgeEntry,
  handleValidationErrors,
  (req, res) => {
    try {
      const entryData = req.body;
      const entry = knowledgeService.createKnowledgeEntry(entryData);
      
      res.status(201).json({
        success: true,
        message: 'Knowledge entry created successfully',
        entry
      });
    } catch (error) {
      console.error('Create entry error:', error);
      res.status(500).json({
        error: 'Failed to create knowledge entry',
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/knowledge/entries/:knowledgeId
 * Update knowledge entry
 */
router.put('/entries/:knowledgeId',
  authenticateRequest,
  validateKnowledgeId,
  validateKnowledgeEntry,
  handleValidationErrors,
  (req, res) => {
    try {
      const { knowledgeId } = req.params;
      const updateData = req.body;
      const entry = knowledgeService.updateKnowledgeEntry(knowledgeId, updateData);
      
      res.json({
        success: true,
        message: 'Knowledge entry updated successfully',
        entry
      });
    } catch (error) {
      console.error('Update entry error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: 'Failed to update knowledge entry',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/knowledge/entries/:knowledgeId
 * Delete knowledge entry
 */
router.delete('/entries/:knowledgeId',
  authenticateRequest,
  validateKnowledgeId,
  handleValidationErrors,
  (req, res) => {
    try {
      const { knowledgeId } = req.params;
      const entry = knowledgeService.deleteKnowledgeEntry(knowledgeId);
      
      res.json({
        success: true,
        message: 'Knowledge entry deleted successfully',
        entry
      });
    } catch (error) {
      console.error('Delete entry error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: 'Failed to delete knowledge entry',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/knowledge/categories
 * Get all knowledge categories
 */
router.get('/categories', authenticateRequest, (req, res) => {
  try {
    const categories = knowledgeService.getCategories();
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      message: error.message
    });
  }
});

/**
 * GET /api/knowledge/tags
 * Get all knowledge tags
 */
router.get('/tags', authenticateRequest, (req, res) => {
  try {
    const tags = knowledgeService.getTags();
    
    res.json({
      success: true,
      tags
    });
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({
      error: 'Failed to get tags',
      message: error.message
    });
  }
});

/**
 * GET /api/knowledge/health
 * Knowledge service health check
 */
router.get('/health', (req, res) => {
  try {
    const stats = {
      totalEntries: knowledgeService.knowledgeBase.length,
      categories: knowledgeService.getCategories().length,
      tags: knowledgeService.getTags().length
    };
    
    res.json({
      success: true,
      status: 'healthy',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Knowledge health check error:', error);
    res.status(500).json({
      error: 'Knowledge health check failed',
      message: error.message
    });
  }
});

module.exports = router;