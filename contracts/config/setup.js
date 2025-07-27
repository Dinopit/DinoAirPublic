/**
 * Pact Test Setup
 * Common setup and utilities for contract testing
 */

const { Pact } = require('@pact-foundation/pact');
const PACT_CONFIG = require('./pact.config');

/**
 * Create a Pact mock server for consumer tests
 */
function createPactMockServer() {
  return new Pact({
    consumer: PACT_CONFIG.consumer.name,
    provider: PACT_CONFIG.provider.name,
    port: PACT_CONFIG.mockServer.port,
    host: PACT_CONFIG.mockServer.host,
    dir: PACT_CONFIG.pactFilesDir,
    log: PACT_CONFIG.pactFilesDir + '/pact.log',
    logLevel: PACT_CONFIG.logLevel,
    spec: 2,
  });
}

/**
 * Common matchers for contract testing
 */
const Matchers = {
  // String matchers
  string: (example) => ({ match: 'type', example }),
  uuid: () => ({ match: 'regex', regex: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', example: '12345678-1234-1234-1234-123456789012' }),
  isoDateTime: () => ({ match: 'regex', regex: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}', example: '2023-01-01T00:00:00Z' }),
  
  // Number matchers
  integer: (example) => ({ match: 'type', example }),
  number: (example) => ({ match: 'type', example }),
  
  // Boolean matcher
  boolean: (example) => ({ match: 'type', example }),
  
  // Array matcher
  eachLike: (template, options = {}) => ({ 
    match: 'type', 
    min: options.min || 1, 
    example: [template] 
  }),
  
  // Object matcher
  like: (template) => ({ match: 'type', example: template }),
};

/**
 * Common response templates
 */
const ResponseTemplates = {
  success: (data) => ({
    success: Matchers.boolean(true),
    ...data,
  }),
  
  error: (message, code) => ({
    success: Matchers.boolean(false),
    error: Matchers.string(message),
    code: code ? Matchers.string(code) : undefined,
  }),
  
  pagination: (items, page = 1, limit = 10, total = 100) => ({
    success: Matchers.boolean(true),
    data: Matchers.eachLike(items),
    pagination: {
      page: Matchers.integer(page),
      limit: Matchers.integer(limit),
      total: Matchers.integer(total),
      pages: Matchers.integer(Math.ceil(total / limit)),
    },
  }),
};

/**
 * Common API endpoints
 */
const Endpoints = {
  artifacts: {
    list: '/api/v1/artifacts',
    byId: (id) => `/api/v1/artifacts/${id}`,
    stats: '/api/v1/artifacts/stats',
  },
  
  models: {
    list: '/api/v1/models',
    byId: (id) => `/api/v1/models/${id}`,
    install: (id) => `/api/v1/models/${id}/install`,
    uninstall: (id) => `/api/v1/models/${id}/uninstall`,
    stats: '/api/v1/models/stats',
  },
  
  personalities: {
    list: '/api/v1/personalities',
    byId: (id) => `/api/v1/personalities/${id}`,
  },
  
  health: '/api/health',
};

module.exports = {
  createPactMockServer,
  Matchers,
  ResponseTemplates,
  Endpoints,
  PACT_CONFIG,
};