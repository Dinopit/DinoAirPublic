/**
 * V1 Personalities API Routes
 * AI personality and system prompt management
 */

const express = require('express');
const router = express.Router();

// In-memory personality storage (in production, use database)
let personalities = [
  {
    id: '1',
    name: 'Helpful Assistant',
    description: 'A friendly and helpful AI assistant that provides clear, accurate information and assistance.',
    systemPrompt: 'You are a helpful, harmless, and honest AI assistant. Always strive to be accurate, clear, and helpful in your responses. If you\'re unsure about something, say so rather than guessing.',
    category: 'general',
    tags: ['helpful', 'general', 'default'],
    isDefault: true,
    isActive: true,
    config: {
      temperature: 0.7,
      formality: 'balanced',
      verbosity: 'moderate',
      creativity: 'balanced'
    },
    metadata: {
      author: 'DinoAir Team',
      version: '1.0',
      createdAt: new Date('2025-01-15T10:00:00Z'),
      updatedAt: new Date('2025-01-15T10:00:00Z'),
      usageCount: 156,
      lastUsed: new Date('2025-01-24T16:20:00Z')
    }
  },
  {
    id: '2',
    name: 'Creative Writer',
    description: 'An imaginative AI that excels at creative writing, storytelling, and artistic expression.',
    systemPrompt: 'You are a creative and imaginative AI writer. You excel at storytelling, creative writing, poetry, and artistic expression. Use vivid language, engaging narratives, and creative flair in your responses. Feel free to be expressive and artistic while maintaining helpfulness.',
    category: 'creative',
    tags: ['creative', 'writing', 'storytelling', 'artistic'],
    isDefault: false,
    isActive: true,
    config: {
      temperature: 0.9,
      formality: 'casual',
      verbosity: 'detailed',
      creativity: 'high'
    },
    metadata: {
      author: 'DinoAir Team',
      version: '1.0',
      createdAt: new Date('2025-01-16T14:30:00Z'),
      updatedAt: new Date('2025-01-16T14:30:00Z'),
      usageCount: 89,
      lastUsed: new Date('2025-01-23T09:15:00Z')
    }
  },
  {
    id: '3',
    name: 'Technical Expert',
    description: 'A knowledgeable AI specialized in technical topics, programming, and problem-solving.',
    systemPrompt: 'You are a technical expert AI with deep knowledge in programming, software development, system administration, and technical problem-solving. Provide precise, detailed technical information. Use appropriate technical terminology and include code examples when relevant. Be thorough and accurate in your technical explanations.',
    category: 'technical',
    tags: ['technical', 'programming', 'expert', 'detailed'],
    isDefault: false,
    isActive: true,
    config: {
      temperature: 0.3,
      formality: 'professional',
      verbosity: 'detailed',
      creativity: 'low'
    },
    metadata: {
      author: 'DinoAir Team',
      version: '1.0',
      createdAt: new Date('2025-01-17T11:45:00Z'),
      updatedAt: new Date('2025-01-17T11:45:00Z'),
      usageCount: 67,
      lastUsed: new Date('2025-01-24T13:30:00Z')
    }
  },
  {
    id: '4',
    name: 'Casual Chat',
    description: 'A friendly, conversational AI that chats in a relaxed, informal manner.',
    systemPrompt: 'You are a friendly, casual AI companion. Chat in a relaxed, informal way like you\'re talking to a good friend. Use casual language, be personable, and don\'t be overly formal. Feel free to use humor and be conversational while still being helpful.',
    category: 'social',
    tags: ['casual', 'friendly', 'conversational', 'informal'],
    isDefault: false,
    isActive: true,
    config: {
      temperature: 0.8,
      formality: 'casual',
      verbosity: 'moderate',
      creativity: 'moderate'
    },
    metadata: {
      author: 'DinoAir Team',
      version: '1.0',
      createdAt: new Date('2025-01-18T16:20:00Z'),
      updatedAt: new Date('2025-01-18T16:20:00Z'),
      usageCount: 34,
      lastUsed: new Date('2025-01-22T20:45:00Z')
    }
  },
  {
    id: '5',
    name: 'Educational Tutor',
    description: 'A patient, educational AI that excels at teaching and explaining complex topics.',
    systemPrompt: 'You are an educational tutor AI. Your role is to teach and explain concepts clearly and patiently. Break down complex topics into understandable parts, use examples and analogies, ask clarifying questions, and adapt your explanations to the learner\'s level. Be encouraging and supportive in your teaching approach.',
    category: 'educational',
    tags: ['educational', 'tutor', 'teaching', 'patient'],
    isDefault: false,
    isActive: true,
    config: {
      temperature: 0.6,
      formality: 'balanced',
      verbosity: 'detailed',
      creativity: 'moderate'
    },
    metadata: {
      author: 'DinoAir Team',
      version: '1.0',
      createdAt: new Date('2025-01-19T12:10:00Z'),
      updatedAt: new Date('2025-01-19T12:10:00Z'),
      usageCount: 28,
      lastUsed: new Date('2025-01-21T14:20:00Z')
    }
  }
];

let nextId = 6;

// GET /api/v1/personalities - Get all personalities
router.get('/', (req, res) => {
  try {
    const { 
      category, 
      active, 
      search, 
      sortBy = 'name', 
      sortOrder = 'asc' 
    } = req.query;

    let filteredPersonalities = [...personalities];

    // Filter by category
    if (category) {
      filteredPersonalities = filteredPersonalities.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by active status
    if (active !== undefined) {
      const isActive = active === 'true';
      filteredPersonalities = filteredPersonalities.filter(p => p.isActive === isActive);
    }

    // Search in name, description, and tags
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPersonalities = filteredPersonalities.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort personalities
    filteredPersonalities.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'lastUsed') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    res.json({
      success: true,
      personalities: filteredPersonalities,
      total: filteredPersonalities.length,
      filters: {
        category,
        active,
        search,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personalities',
      message: error.message
    });
  }
});

// GET /api/v1/personalities/:id - Get specific personality
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const personality = personalities.find(p => p.id === id);

  if (!personality) {
    return res.status(404).json({
      success: false,
      error: 'Personality not found'
    });
  }

  res.json({
    success: true,
    personality
  });
});

// POST /api/v1/personalities - Create new personality
router.post('/', (req, res) => {
  try {
    const {
      name,
      description,
      systemPrompt,
      category = 'custom',
      tags = [],
      config = {},
      metadata = {}
    } = req.body;

    if (!name || !description || !systemPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, and systemPrompt are required'
      });
    }

    // Check if personality with same name exists
    const existingPersonality = personalities.find(p => 
      p.name.toLowerCase() === name.toLowerCase()
    );
    if (existingPersonality) {
      return res.status(409).json({
        success: false,
        error: 'Personality with this name already exists'
      });
    }

    const newPersonality = {
      id: nextId.toString(),
      name,
      description,
      systemPrompt,
      category,
      tags: Array.isArray(tags) ? tags : [],
      isDefault: false,
      isActive: true,
      config: {
        temperature: 0.7,
        formality: 'balanced',
        verbosity: 'moderate',
        creativity: 'balanced',
        ...config
      },
      metadata: {
        author: 'User',
        version: '1.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        lastUsed: null,
        ...metadata
      }
    };

    personalities.push(newPersonality);
    nextId++;

    res.status(201).json({
      success: true,
      personality: newPersonality
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create personality',
      message: error.message
    });
  }
});

// PUT /api/v1/personalities/:id - Update personality
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const personalityIndex = personalities.findIndex(p => p.id === id);
    if (personalityIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Personality not found'
      });
    }

    const personality = personalities[personalityIndex];
    
    // Update allowed fields
    const allowedFields = [
      'name', 'description', 'systemPrompt', 'category', 'tags', 
      'isDefault', 'isActive'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        personality[field] = updates[field];
      }
    });

    // Update config if provided
    if (updates.config && typeof updates.config === 'object') {
      personality.config = { ...personality.config, ...updates.config };
    }

    // Update metadata if provided
    if (updates.metadata && typeof updates.metadata === 'object') {
      personality.metadata = { ...personality.metadata, ...updates.metadata };
    }

    // Update timestamp
    personality.metadata.updatedAt = new Date();

    // If setting as default, unset other defaults
    if (updates.isDefault === true) {
      personalities.forEach(p => {
        if (p.id !== id) {
          p.isDefault = false;
        }
      });
    }

    res.json({
      success: true,
      personality
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update personality',
      message: error.message
    });
  }
});

// DELETE /api/v1/personalities/:id - Delete personality
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const personalityIndex = personalities.findIndex(p => p.id === id);

  if (personalityIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Personality not found'
    });
  }

  const personality = personalities[personalityIndex];

  // Prevent deletion of default personality
  if (personality.isDefault) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete default personality'
    });
  }

  const deletedPersonality = personalities.splice(personalityIndex, 1)[0];

  res.json({
    success: true,
    message: 'Personality deleted successfully',
    personality: deletedPersonality
  });
});

// POST /api/v1/personalities/:id/use - Record personality usage
router.post('/:id/use', (req, res) => {
  const { id } = req.params;
  const personality = personalities.find(p => p.id === id);

  if (!personality) {
    return res.status(404).json({
      success: false,
      error: 'Personality not found'
    });
  }

  // Update usage statistics
  personality.metadata.lastUsed = new Date();
  personality.metadata.usageCount = (personality.metadata.usageCount || 0) + 1;

  res.json({
    success: true,
    message: 'Personality usage recorded',
    usageCount: personality.metadata.usageCount
  });
});

// POST /api/v1/personalities/:id/duplicate - Duplicate personality
router.post('/:id/duplicate', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const originalPersonality = personalities.find(p => p.id === id);
    if (!originalPersonality) {
      return res.status(404).json({
        success: false,
        error: 'Personality not found'
      });
    }

    const duplicateName = name || `${originalPersonality.name} (Copy)`;

    // Check if name already exists
    const existingPersonality = personalities.find(p => 
      p.name.toLowerCase() === duplicateName.toLowerCase()
    );
    if (existingPersonality) {
      return res.status(409).json({
        success: false,
        error: 'Personality with this name already exists'
      });
    }

    const duplicatedPersonality = {
      ...originalPersonality,
      id: nextId.toString(),
      name: duplicateName,
      isDefault: false,
      metadata: {
        ...originalPersonality.metadata,
        author: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        lastUsed: null
      }
    };

    personalities.push(duplicatedPersonality);
    nextId++;

    res.status(201).json({
      success: true,
      personality: duplicatedPersonality
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate personality',
      message: error.message
    });
  }
});

// GET /api/v1/personalities/categories - Get available categories
router.get('/categories', (req, res) => {
  const categories = [...new Set(personalities.map(p => p.category))];
  const categoriesWithCounts = categories.map(category => ({
    name: category,
    count: personalities.filter(p => p.category === category).length
  }));

  res.json({
    success: true,
    categories: categoriesWithCounts
  });
});

// GET /api/v1/personalities/stats - Get personality statistics
router.get('/stats', (req, res) => {
  const stats = {
    total: personalities.length,
    active: personalities.filter(p => p.isActive).length,
    byCategory: {},
    totalUsage: 0,
    mostUsed: null,
    recentlyCreated: 0
  };

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let mostUsedCount = 0;

  personalities.forEach(personality => {
    // Count by category
    stats.byCategory[personality.category] = (stats.byCategory[personality.category] || 0) + 1;
    
    // Total usage
    const usage = personality.metadata.usageCount || 0;
    stats.totalUsage += usage;
    
    // Most used personality
    if (usage > mostUsedCount) {
      mostUsedCount = usage;
      stats.mostUsed = {
        id: personality.id,
        name: personality.name,
        usageCount: usage
      };
    }

    // Recently created
    if (new Date(personality.metadata.createdAt) > oneWeekAgo) {
      stats.recentlyCreated++;
    }
  });

  res.json({
    success: true,
    stats
  });
});

// POST /api/v1/personalities/import - Import personalities from JSON
router.post('/import', (req, res) => {
  try {
    const { personalities: importedPersonalities, overwrite = false } = req.body;

    if (!Array.isArray(importedPersonalities)) {
      return res.status(400).json({
        success: false,
        error: 'Personalities must be an array'
      });
    }

    const imported = [];
    const errors = [];
    const skipped = [];

    importedPersonalities.forEach((personalityData, index) => {
      try {
        const { name, description, systemPrompt } = personalityData;

        if (!name || !description || !systemPrompt) {
          errors.push({
            index,
            error: 'Missing required fields: name, description, systemPrompt'
          });
          return;
        }

        // Check if personality exists
        const existingIndex = personalities.findIndex(p => 
          p.name.toLowerCase() === name.toLowerCase()
        );

        if (existingIndex !== -1) {
          if (overwrite) {
            // Update existing personality
            personalities[existingIndex] = {
              ...personalities[existingIndex],
              ...personalityData,
              id: personalities[existingIndex].id,
              metadata: {
                ...personalities[existingIndex].metadata,
                ...personalityData.metadata,
                updatedAt: new Date()
              }
            };
            imported.push(personalities[existingIndex]);
          } else {
            skipped.push({ index, name, reason: 'Already exists' });
          }
        } else {
          // Create new personality
          const newPersonality = {
            id: nextId.toString(),
            name,
            description,
            systemPrompt,
            category: personalityData.category || 'imported',
            tags: personalityData.tags || ['imported'],
            isDefault: false,
            isActive: personalityData.isActive !== false,
            config: {
              temperature: 0.7,
              formality: 'balanced',
              verbosity: 'moderate',
              creativity: 'balanced',
              ...personalityData.config
            },
            metadata: {
              author: 'Import',
              version: '1.0',
              createdAt: new Date(),
              updatedAt: new Date(),
              usageCount: 0,
              lastUsed: null,
              ...personalityData.metadata
            }
          };

          personalities.push(newPersonality);
          imported.push(newPersonality);
          nextId++;
        }
      } catch (error) {
        errors.push({
          index,
          error: error.message
        });
      }
    });

    res.json({
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      personalities: imported,
      skippedItems: skipped,
      errorItems: errors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to import personalities',
      message: error.message
    });
  }
});

// GET /api/v1/personalities/export - Export personalities as JSON
router.get('/export', (req, res) => {
  const { ids } = req.query;
  
  let exportPersonalities = personalities;
  
  if (ids) {
    const idArray = ids.split(',');
    exportPersonalities = personalities.filter(p => idArray.includes(p.id));
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    personalities: exportPersonalities.map(p => ({
      ...p,
      // Remove internal IDs for clean export
      id: undefined
    }))
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="dinoair-personalities.json"');
  res.json(exportData);
});

module.exports = router;