/**
 * Chat API Routes
 * Converted from Next.js to Express.js with streaming support
 * Integrated with Supabase for data persistence
 */

const express = require('express');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const { chatSessions, chatMessages, chatMetrics } = require('../../lib/supabase');
const { rateLimits, chatValidation, sanitizeInput } = require('../../middleware/validation');
const { resourceManager } = require('../../lib/resource-manager');
const { ollamaBreaker } = require('../../lib/circuit-breaker');
const { withRetry, isRetryableError } = require('../../lib/retry');
const router = express.Router();

// In-memory fallback metrics (if Supabase is not available)
const fallbackMetrics = {
  totalRequests: 0,
  totalResponseTime: 0,
  totalTokens: 0
};

/**
 * Record chat response time in both Supabase and fallback
 */
async function recordChatResponseTime(sessionId, model, duration, tokenCount) {
  // Update fallback metrics
  fallbackMetrics.totalRequests++;
  fallbackMetrics.totalResponseTime += duration;
  fallbackMetrics.totalTokens += tokenCount;

  // Try to record in Supabase
  try {
    if (sessionId && model) {
      await chatMetrics.record(sessionId, model, duration, tokenCount, {
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.warn('Failed to record metrics in Supabase:', error.message);
  }
}

/**
 * Get or create a chat session
 */
async function getOrCreateSession(userId, sessionId) {
  try {
    // Try to get existing session
    if (sessionId) {
      const existingSession = await chatSessions.getById(sessionId);
      if (existingSession) {
        return existingSession;
      }
    }

    // Create new session
    const newSessionId = sessionId || uuidv4();
    const newSession = await chatSessions.create(userId || 'anonymous', newSessionId, {
      created_via: 'chat_api',
      user_agent: 'web-gui'
    });

    return newSession;
  } catch (error) {
    console.warn('Failed to create/get session in Supabase:', error.message);
    // Return a fallback session object
    return {
      id: sessionId || uuidv4(),
      user_id: userId || 'anonymous',
      created_at: new Date().toISOString(),
      metadata: {}
    };
  }
}

/**
 * Store chat message in Supabase
 */
async function storeMessage(sessionId, role, content, metadata = {}) {
  try {
    await chatMessages.add(sessionId, role, content, {
      ...metadata,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Failed to store message in Supabase:', error.message);
  }
}

// POST /api/chat - Main chat endpoint with streaming
router.post('/', rateLimits.chat, sanitizeInput, chatValidation.chat, async (req, res) => {
  const startTime = Date.now();
  let totalTokens = 0;
  let chatSession = null;
  let assistantResponse = '';

  try {
    const { messages, model, systemPrompt, sessionId, userId } = req.body;

    // Get the last user message (validation ensures this exists and is from user)
    const lastMessage = messages[messages.length - 1];

    // Get or create chat session
    chatSession = await getOrCreateSession(userId, sessionId);
    console.log('Chat session:', chatSession.id);

    // Store the user message in Supabase
    await storeMessage(chatSession.id, 'user', lastMessage.content, {
      model: model || 'qwen:7b-chat-v1.5-q4_K_M',
      system_prompt: systemPrompt || null
    });

    // Format the prompt for Ollama with optional system prompt
    let prompt = lastMessage.content;
    if (systemPrompt) {
      prompt = `System: ${systemPrompt}\n\nUser: ${prompt}`;
    }

    // Use provided model or default
    const selectedModel = model || 'qwen:7b-chat-v1.5-q4_K_M';

    // Set up streaming response headers
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });

    resourceManager.registerStream(res);

    try {
      // Track API response time
      const apiStartTime = Date.now();

      // Call Ollama API with circuit breaker and retry protection
      const response = await ollamaBreaker.call(async () => {
        return await withRetry(async () => {
          const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: selectedModel,
              prompt,
              stream: true
            })
          });

          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
          }

          return response;
        }, {
          maxRetries: 2,
          retryCondition: isRetryableError
        });
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Ollama');
      }

      // Stream the response
      response.body.on('data', chunk => {
        const text = chunk.toString();
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              // Send the response chunk to the client
              res.write(json.response);
              // Collect the assistant response
              assistantResponse += json.response;
              // Estimate tokens (rough approximation)
              totalTokens += Math.ceil(json.response.length / 4);
            }

            // If this is the final response, record metrics and store message
            if (json.done) {
              const duration = Date.now() - startTime;

              // Store the assistant message in Supabase (async, don't wait)
              if (chatSession && assistantResponse) {
                storeMessage(chatSession.id, 'assistant', assistantResponse, {
                  model: selectedModel,
                  response_time_ms: duration,
                  token_count: totalTokens
                }).catch(error => {
                  console.warn('Failed to store assistant message:', error.message);
                });
              }

              // Record metrics in Supabase (async, don't wait)
              const userMessageTokens = Math.ceil(prompt.length / 4);
              const totalTokensUsed = totalTokens + userMessageTokens;
              recordChatResponseTime(
                chatSession?.id,
                selectedModel,
                duration,
                totalTokensUsed
              ).catch(error => {
                console.warn('Failed to record metrics:', error.message);
              });

              // End the response
              res.end();
            }
          } catch (e) {
            console.error('Error parsing Ollama response:', e);
          }
        }
      });

      response.body.on('error', error => {
        console.error('Streaming error:', error);
        resourceManager.closeStream(res);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Streaming error occurred' });
        } else {
          res.end();
        }
      });

      response.body.on('end', () => {
        resourceManager.closeStream(res);
        if (!res.finished) {
          res.end();
        }
      });
    } catch (error) {
      console.error('Ollama API error:', error);

      if (!res.headersSent) {
        // Check if Ollama is not running
        if (error.message.includes('ECONNREFUSED')) {
          res.status(503).json({
            error: 'The AI chat service is temporarily unavailable. Please try again in a few moments.',
            details: 'Unable to connect to the language model service.',
            category: 'service_unavailable'
          });
        } else {
          res.status(500).json({
            error: 'We\'re experiencing technical difficulties with the chat service. Please try again.',
            category: 'chat_error'
          });
        }
      } else {
        res.end();
      }
    }
  } catch (error) {
    console.error('Chat API error:', error);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'We encountered an issue processing your message. Please try again.',
        category: 'processing_error'
      });
    }
  }
});

// GET /api/chat/metrics - Get chat metrics
router.get('/metrics', async (req, res) => {
  try {
    const { timeframe = 'day' } = req.query;

    // Try to get metrics from Supabase
    const supabaseMetrics = await chatMetrics.getAggregated(timeframe);

    // Combine with fallback metrics if needed
    const combinedMetrics = {
      totalRequests: supabaseMetrics.totalRequests + fallbackMetrics.totalRequests,
      averageResponseTime: supabaseMetrics.avgResponseTime
        || (fallbackMetrics.totalRequests > 0
          ? Math.round(fallbackMetrics.totalResponseTime / fallbackMetrics.totalRequests)
          : 0),
      totalTokens: supabaseMetrics.totalTokens + fallbackMetrics.totalTokens,
      timeframe: supabaseMetrics.timeframe,
      source: supabaseMetrics.totalRequests > 0 ? 'supabase+fallback' : 'fallback'
    };

    res.json(combinedMetrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);

    // Fallback to in-memory metrics
    const avgResponseTime = fallbackMetrics.totalRequests > 0
      ? Math.round(fallbackMetrics.totalResponseTime / fallbackMetrics.totalRequests)
      : 0;

    res.json({
      totalRequests: fallbackMetrics.totalRequests,
      averageResponseTime: avgResponseTime,
      totalTokens: fallbackMetrics.totalTokens,
      timeframe: 'session',
      source: 'fallback'
    });
  }
});

// GET /api/chat/models - Get available models (proxy to Ollama)
router.get('/models', async (req, res) => {
  try {
    const response = await ollamaBreaker.call(async () => {
      return await withRetry(async () => {
        const response = await fetch('http://localhost:11434/api/tags');

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        return response;
      }, {
        maxRetries: 1,
        retryCondition: isRetryableError
      });
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching models:', error);

    if (error.message.includes('ECONNREFUSED')) {
      res.status(503).json({
        error: 'The AI model service is temporarily unavailable. Please try again in a few moments.',
        category: 'service_unavailable'
      });
    } else {
      res.status(500).json({
        error: 'Unable to load available AI models. Please try again.',
        category: 'models_error'
      });
    }
  }
});

// GET /api/chat/sessions - Get user chat sessions
router.get('/sessions', async (req, res) => {
  try {
    const { userId = 'anonymous', limit = 50 } = req.query;

    const sessions = await chatSessions.getByUserId(userId, parseInt(limit));

    res.json({
      sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      error: 'Failed to fetch chat sessions'
    });
  }
});

// GET /api/chat/sessions/:id - Get specific session details
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const session = await chatSessions.getById(id);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      error: 'Failed to fetch session details'
    });
  }
});

// GET /api/chat/sessions/:id/messages - Get messages for a session
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    // First check if session exists
    const session = await chatSessions.getById(id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const messages = await chatMessages.getBySessionId(id, parseInt(limit));

    res.json({
      sessionId: id,
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error fetching session messages:', error);
    res.status(500).json({
      error: 'Failed to fetch session messages'
    });
  }
});

// DELETE /api/chat/sessions/:id - Delete a chat session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if session exists
    const session = await chatSessions.getById(id);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    // Delete messages first (due to foreign key constraints)
    await chatMessages.deleteBySessionId(id);

    // Note: In a real implementation, you'd also delete the session itself
    // For now, we'll just delete the messages

    res.json({
      message: 'Session messages deleted successfully',
      sessionId: id
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      error: 'Failed to delete session'
    });
  }
});

// POST /api/chat/sessions - Create a new chat session
router.post('/sessions', async (req, res) => {
  try {
    const { userId = 'anonymous', metadata = {} } = req.body;

    const sessionId = uuidv4();
    const session = await chatSessions.create(userId, sessionId, {
      ...metadata,
      created_via: 'api',
      created_at: new Date().toISOString()
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      error: 'Failed to create chat session'
    });
  }
});

module.exports = router;
