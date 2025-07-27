/**
 * Ollama API Routes
 * Proxy and management routes for Ollama service
 */

const express = require('express');
const fetch = require('node-fetch');
const { ollamaBreaker } = require('../../lib/circuit-breaker');
const { withRetry, isRetryableError } = require('../../lib/retry');
const router = express.Router();

// GET /api/ollama/models - Get available models
router.get('/models', async (req, res) => {
  try {
    const response = await ollamaBreaker.call(async () => {
      return await withRetry(async () => {
        const response = await fetch('http://localhost:11434/api/tags', {
          timeout: 10000
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        return response;
      }, {
        maxRetries: 2,
        retryCondition: isRetryableError
      });
    });

    const data = await response.json();
    res.json({
      success: true,
      models: data.models || [],
      count: data.models ? data.models.length : 0
    });
  } catch (error) {
    console.error('Error fetching Ollama models:', error);

    if (error.message.includes('ECONNREFUSED')) {
      res.status(503).json({
        success: false,
        error: 'Ollama service is not running. Please start Ollama first.',
        code: 'SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available models',
        message: error.message
      });
    }
  }
});

// GET /api/ollama/version - Get Ollama version
router.get('/version', async (req, res) => {
  try {
    const response = await ollamaBreaker.call(async () => {
      return await withRetry(async () => {
        const response = await fetch('http://localhost:11434/api/version', {
          timeout: 5000
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        return response;
      }, {
        maxRetries: 2,
        retryCondition: isRetryableError
      });
    });

    const data = await response.json();
    res.json({
      success: true,
      version: data.version || 'unknown'
    });
  } catch (error) {
    console.error('Error fetching Ollama version:', error);

    if (error.message.includes('ECONNREFUSED')) {
      res.status(503).json({
        success: false,
        error: 'Ollama service is not running',
        code: 'SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch Ollama version',
        message: error.message
      });
    }
  }
});

// POST /api/ollama/pull - Pull a model
router.post('/pull', async (req, res) => {
  try {
    const { model } = req.body;

    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }

    // Set up streaming response for model pull progress
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache'
    });

    const response = await fetch('http://localhost:11434/api/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: model,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    // Stream the pull progress
    response.body.on('data', chunk => {
      const text = chunk.toString();
      const lines = text.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          res.write(`${JSON.stringify(json)}\n`);

          if (json.status === 'success') {
            res.end();
          }
        } catch (e) {
          console.error('Error parsing pull response:', e);
        }
      }
    });

    response.body.on('error', error => {
      console.error('Pull streaming error:', error);
      res.end();
    });

    response.body.on('end', () => {
      if (!res.finished) {
        res.end();
      }
    });
  } catch (error) {
    console.error('Error pulling model:', error);

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
          error: 'Failed to pull model',
          message: error.message
        });
      }
    }
  }
});

// DELETE /api/ollama/models/:model - Delete a model
router.delete('/models/:model', async (req, res) => {
  try {
    const { model } = req.params;

    const response = await fetch('http://localhost:11434/api/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: model
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    res.json({
      success: true,
      message: `Model ${model} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting model:', error);

    if (error.message.includes('ECONNREFUSED')) {
      res.status(503).json({
        success: false,
        error: 'Ollama service is not running',
        code: 'SERVICE_UNAVAILABLE'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete model',
        message: error.message
      });
    }
  }
});

// GET /api/ollama/status - Get Ollama service status
router.get('/status', async (req, res) => {
  try {
    const startTime = Date.now();
    const response = await ollamaBreaker.call(async () => {
      return await withRetry(async () => {
        const response = await fetch('http://localhost:11434/api/tags', {
          timeout: 5000
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response;
      }, {
        maxRetries: 1,
        retryCondition: isRetryableError
      });
    });

    const responseTime = Date.now() - startTime;
    const data = await response.json();
    res.json({
      success: true,
      status: 'running',
      responseTime,
      modelCount: data.models ? data.models.length : 0
    });
  } catch (error) {
    console.error('Error checking Ollama status:', error);

    res.json({
      success: false,
      status: 'offline',
      error: error.message.includes('ECONNREFUSED') ? 'Service not running' : error.message
    });
  }
});

module.exports = router;
