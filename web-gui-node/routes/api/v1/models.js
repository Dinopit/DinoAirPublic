/**
 * V1 Models API Routes
 * AI model management and configuration
 */

const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();

// In-memory model configurations (in production, use database)
let modelConfigs = [
  {
    id: '1',
    name: 'qwen:7b-chat-v1.5-q4_K_M',
    displayName: 'Qwen 7B Chat',
    description: 'Qwen 7B model optimized for chat conversations with 4-bit quantization',
    type: 'chat',
    size: '4.1GB',
    parameters: '7B',
    quantization: 'Q4_K_M',
    capabilities: ['text-generation', 'conversation', 'code-assistance'],
    tags: ['chat', 'general-purpose', 'multilingual'],
    isDefault: true,
    isInstalled: true,
    config: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      repeat_penalty: 1.1,
      context_length: 4096,
      max_tokens: 2048
    },
    metadata: {
      author: 'Alibaba Cloud',
      license: 'Apache 2.0',
      url: 'https://huggingface.co/Qwen/Qwen-7B-Chat',
      addedAt: new Date('2025-01-15T10:00:00Z'),
      lastUsed: new Date('2025-01-24T15:30:00Z'),
      usageCount: 45
    }
  },
  {
    id: '2',
    name: 'llama2:13b-chat',
    displayName: 'Llama 2 13B Chat',
    description: 'Meta Llama 2 13B model fine-tuned for chat applications',
    type: 'chat',
    size: '7.3GB',
    parameters: '13B',
    quantization: 'Q4_0',
    capabilities: ['text-generation', 'conversation', 'reasoning'],
    tags: ['chat', 'reasoning', 'large-model'],
    isDefault: false,
    isInstalled: false,
    config: {
      temperature: 0.8,
      top_p: 0.95,
      top_k: 50,
      repeat_penalty: 1.05,
      context_length: 4096,
      max_tokens: 2048
    },
    metadata: {
      author: 'Meta',
      license: 'Custom',
      url: 'https://huggingface.co/meta-llama/Llama-2-13b-chat-hf',
      addedAt: new Date('2025-01-10T14:20:00Z'),
      lastUsed: null,
      usageCount: 0
    }
  },
  {
    id: '3',
    name: 'codellama:7b-instruct',
    displayName: 'Code Llama 7B Instruct',
    description: 'Code Llama model specialized for code generation and programming assistance',
    type: 'code',
    size: '3.8GB',
    parameters: '7B',
    quantization: 'Q4_K_M',
    capabilities: ['code-generation', 'code-completion', 'debugging', 'explanation'],
    tags: ['code', 'programming', 'instruct'],
    isDefault: false,
    isInstalled: true,
    config: {
      temperature: 0.2,
      top_p: 0.9,
      top_k: 30,
      repeat_penalty: 1.1,
      context_length: 8192,
      max_tokens: 4096
    },
    metadata: {
      author: 'Meta',
      license: 'Custom',
      url: 'https://huggingface.co/codellama/CodeLlama-7b-Instruct-hf',
      addedAt: new Date('2025-01-12T09:15:00Z'),
      lastUsed: new Date('2025-01-23T11:45:00Z'),
      usageCount: 23
    }
  }
];

let nextId = 4;

// GET /api/v1/models - Get all models
router.get('/', async (req, res) => {
  try {
    const { 
      installed, 
      type, 
      search, 
      sortBy = 'displayName', 
      sortOrder = 'asc',
      includeOllama = false 
    } = req.query;

    let filteredModels = [...modelConfigs];

    // Filter by installation status
    if (installed !== undefined) {
      const isInstalled = installed === 'true';
      filteredModels = filteredModels.filter(model => model.isInstalled === isInstalled);
    }

    // Filter by type
    if (type) {
      filteredModels = filteredModels.filter(model => 
        model.type.toLowerCase() === type.toLowerCase()
      );
    }

    // Search in name, displayName, and description
    if (search) {
      const searchLower = search.toLowerCase();
      filteredModels = filteredModels.filter(model =>
        model.name.toLowerCase().includes(searchLower) ||
        model.displayName.toLowerCase().includes(searchLower) ||
        model.description.toLowerCase().includes(searchLower) ||
        model.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Sort models
    filteredModels.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'addedAt' || sortBy === 'lastUsed') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Include Ollama models if requested
    let ollamaModels = [];
    if (includeOllama === 'true') {
      try {
        const response = await fetch('http://localhost:11434/api/tags', {
          timeout: 5000
        });
        
        if (response.ok) {
          const data = await response.json();
          ollamaModels = data.models || [];
        }
      } catch (error) {
        console.warn('Could not fetch Ollama models:', error.message);
      }
    }

    res.json({
      success: true,
      models: filteredModels,
      ollamaModels,
      total: filteredModels.length,
      filters: {
        installed,
        type,
        search,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models',
      message: error.message
    });
  }
});

// GET /api/v1/models/:id - Get specific model
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const model = modelConfigs.find(m => m.id === id);

  if (!model) {
    return res.status(404).json({
      success: false,
      error: 'Model not found'
    });
  }

  res.json({
    success: true,
    model
  });
});

// POST /api/v1/models - Add new model configuration
router.post('/', (req, res) => {
  try {
    const {
      name,
      displayName,
      description,
      type = 'chat',
      size,
      parameters,
      quantization,
      capabilities = [],
      tags = [],
      config = {},
      metadata = {}
    } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({
        success: false,
        error: 'Name and displayName are required'
      });
    }

    // Check if model already exists
    const existingModel = modelConfigs.find(m => m.name === name);
    if (existingModel) {
      return res.status(409).json({
        success: false,
        error: 'Model with this name already exists'
      });
    }

    const newModel = {
      id: nextId.toString(),
      name,
      displayName,
      description: description || '',
      type,
      size: size || 'Unknown',
      parameters: parameters || 'Unknown',
      quantization: quantization || 'Unknown',
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      tags: Array.isArray(tags) ? tags : [],
      isDefault: false,
      isInstalled: false,
      config: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        context_length: 4096,
        max_tokens: 2048,
        ...config
      },
      metadata: {
        author: 'Unknown',
        license: 'Unknown',
        addedAt: new Date(),
        lastUsed: null,
        usageCount: 0,
        ...metadata
      }
    };

    modelConfigs.push(newModel);
    nextId++;

    res.status(201).json({
      success: true,
      model: newModel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add model',
      message: error.message
    });
  }
});

// PUT /api/v1/models/:id - Update model configuration
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const modelIndex = modelConfigs.findIndex(m => m.id === id);
    if (modelIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    const model = modelConfigs[modelIndex];
    
    // Update allowed fields
    const allowedFields = [
      'displayName', 'description', 'type', 'size', 'parameters', 
      'quantization', 'capabilities', 'tags', 'isDefault', 'isInstalled'
    ];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        model[field] = updates[field];
      }
    });

    // Update config if provided
    if (updates.config && typeof updates.config === 'object') {
      model.config = { ...model.config, ...updates.config };
    }

    // Update metadata if provided
    if (updates.metadata && typeof updates.metadata === 'object') {
      model.metadata = { ...model.metadata, ...updates.metadata };
    }

    // If setting as default, unset other defaults
    if (updates.isDefault === true) {
      modelConfigs.forEach(m => {
        if (m.id !== id) {
          m.isDefault = false;
        }
      });
    }

    res.json({
      success: true,
      model
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update model',
      message: error.message
    });
  }
});

// DELETE /api/v1/models/:id - Remove model configuration
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const modelIndex = modelConfigs.findIndex(m => m.id === id);

  if (modelIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Model not found'
    });
  }

  const deletedModel = modelConfigs.splice(modelIndex, 1)[0];

  // If deleted model was default, set another as default
  if (deletedModel.isDefault && modelConfigs.length > 0) {
    modelConfigs[0].isDefault = true;
  }

  res.json({
    success: true,
    message: 'Model configuration removed successfully',
    model: deletedModel
  });
});

// POST /api/v1/models/:id/install - Install model via Ollama
router.post('/:id/install', async (req, res) => {
  try {
    const { id } = req.params;
    const model = modelConfigs.find(m => m.id === id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    if (model.isInstalled) {
      return res.status(400).json({
        success: false,
        error: 'Model is already installed'
      });
    }

    // Set up streaming response for installation progress
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    });

    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: model.name,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    // Stream the installation progress
    response.body.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          res.write(JSON.stringify(json) + '\n');
          
          if (json.status === 'success') {
            // Mark model as installed
            model.isInstalled = true;
            res.end();
          }
        } catch (e) {
          console.error('Error parsing installation response:', e);
        }
      }
    });

    response.body.on('error', (error) => {
      console.error('Installation streaming error:', error);
      res.end();
    });

    response.body.on('end', () => {
      if (!res.finished) {
        res.end();
      }
    });

  } catch (error) {
    console.error('Error installing model:', error);
    
    if (!res.headersSent) {
      if (error.message.includes('ECONNREFUSED')) {
        res.status(503).json({
          success: false,
          error: 'Ollama service is not running',
          code: 'SERVICE_UNAVAILABLE'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to install model',
          message: error.message
        });
      }
    }
  }
});

// DELETE /api/v1/models/:id/uninstall - Uninstall model via Ollama
router.delete('/:id/uninstall', async (req, res) => {
  try {
    const { id } = req.params;
    const model = modelConfigs.find(m => m.id === id);

    if (!model) {
      return res.status(404).json({
        success: false,
        error: 'Model not found'
      });
    }

    if (!model.isInstalled) {
      return res.status(400).json({
        success: false,
        error: 'Model is not installed'
      });
    }

    const response = await fetch('http://localhost:11434/api/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: model.name
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    // Mark model as uninstalled
    model.isInstalled = false;

    res.json({
      success: true,
      message: `Model ${model.displayName} uninstalled successfully`
    });

  } catch (error) {
    console.error('Error uninstalling model:', error);
    
    if (error.message.includes('ECONNREFUSED')) {
      res.status(503).json({
        success: false,
        error: 'Ollama service is not running',
        code: 'SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to uninstall model',
        message: error.message
      });
    }
  }
});

// POST /api/v1/models/:id/use - Record model usage
router.post('/:id/use', (req, res) => {
  const { id } = req.params;
  const model = modelConfigs.find(m => m.id === id);

  if (!model) {
    return res.status(404).json({
      success: false,
      error: 'Model not found'
    });
  }

  // Update usage statistics
  model.metadata.lastUsed = new Date();
  model.metadata.usageCount = (model.metadata.usageCount || 0) + 1;

  res.json({
    success: true,
    message: 'Model usage recorded',
    usageCount: model.metadata.usageCount
  });
});

// GET /api/v1/models/stats - Get model statistics
router.get('/stats', (req, res) => {
  const stats = {
    total: modelConfigs.length,
    installed: modelConfigs.filter(m => m.isInstalled).length,
    byType: {},
    byQuantization: {},
    totalUsage: 0,
    mostUsed: null
  };

  let mostUsedCount = 0;

  modelConfigs.forEach(model => {
    // Count by type
    stats.byType[model.type] = (stats.byType[model.type] || 0) + 1;
    
    // Count by quantization
    if (model.quantization) {
      stats.byQuantization[model.quantization] = (stats.byQuantization[model.quantization] || 0) + 1;
    }
    
    // Total usage
    const usage = model.metadata.usageCount || 0;
    stats.totalUsage += usage;
    
    // Most used model
    if (usage > mostUsedCount) {
      mostUsedCount = usage;
      stats.mostUsed = {
        id: model.id,
        name: model.displayName,
        usageCount: usage
      };
    }
  });

  res.json({
    success: true,
    stats
  });
});

module.exports = router;