# Contract Testing Documentation

This document provides comprehensive guidance on implementing and maintaining contract testing in the DinoAir application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Writing Contract Tests](#writing-contract-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Overview

Contract testing is a technique for ensuring that services can communicate correctly by testing the interactions between consumer and provider services. This approach enables teams to:

- **Catch integration issues early** in the development cycle
- **Deploy services independently** with confidence
- **Reduce the need for complex end-to-end tests**
- **Document API expectations** as executable specifications

## Architecture

Our contract testing setup uses [Pact](https://pact.io/) with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Consumer      │    │   Pact Broker   │    │   Provider      │
│   (Frontend)    │    │                 │    │   (Backend)     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Generate Pacts     │                       │
         └──────────────────────▶│                       │
                                 │ 2. Store Contracts    │
                                 │◀──────────────────────┘
                                 │ 3. Verify Contracts   │
                                 └──────────────────────▶│
```

### Components

1. **Consumer (Frontend)**: Web-GUI that consumes API services
2. **Provider (Backend)**: Web-GUI-Node server that provides API services
3. **Pact Broker**: Central repository for storing and managing contracts
4. **CI/CD Pipeline**: Automated testing and verification workflow

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Git

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Dinopit/DinoAirPublic.git
   cd DinoAirPublic
   ```

2. **Install dependencies:**
   ```bash
   # Frontend dependencies
   cd web-gui
   npm install
   
   # Backend dependencies
   cd ../web-gui-node
   npm install
   ```

3. **Start the Pact Broker:**
   ```bash
   cd ../contracts/pact-broker
   docker-compose up -d
   ```

4. **Verify the setup:**
   ```bash
   # Run consumer tests
   cd ../../web-gui
   npm run test:contracts:consumer
   
   # Run provider verification
   cd ../web-gui-node
   npm run test:contracts:provider
   ```

## Writing Contract Tests

### Consumer Tests (Frontend)

Consumer tests define what the frontend expects from the backend API.

**Structure:**
```javascript
describe('API Contract Tests', () => {
  const provider = createPactMockServer();

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  it('should handle successful API call', async () => {
    // Arrange: Set up expectations
    await provider.addInteraction({
      state: 'data exists',
      uponReceiving: 'a request for data',
      withRequest: {
        method: 'GET',
        path: '/api/v1/data',
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { success: true, data: [...] },
      },
    });

    // Act: Make the API call
    const response = await fetch(`${provider.mockService.baseUrl}/api/v1/data`);
    const data = await response.json();

    // Assert: Verify the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

**Key Guidelines:**
- Use realistic test data that represents actual usage
- Test both success and error scenarios
- Use matchers for flexible response validation
- Keep tests focused on the contract, not implementation details

### Provider Tests (Backend)

Provider tests verify that the backend satisfies the contracts.

**Structure:**
```javascript
describe('API Provider Verification', () => {
  it('should satisfy the contract', async () => {
    const opts = {
      provider: 'DinoAir-Backend',
      providerBaseUrl: 'http://localhost:3000',
      pactUrls: ['path/to/pact/files'],
      stateHandlers: {
        'data exists': async () => {
          // Set up test data
        },
      },
    };

    const verifier = new Verifier(opts);
    await verifier.verifyProvider();
  });
});
```

**Key Guidelines:**
- Implement state handlers to set up test data
- Use isolated test environments
- Clean up test data after verification
- Handle async operations properly

## CI/CD Integration

### Pipeline Flow

1. **Consumer Tests**: Run on frontend PR creation
2. **Contract Publication**: Publish contracts on merge to main
3. **Provider Verification**: Verify contracts on backend changes
4. **Deployment**: Deploy only if contracts are satisfied

### Environment Variables

Set these in your CI/CD environment:

```bash
PACT_BROKER_BASE_URL=http://localhost:9292
PACT_BROKER_USERNAME=pact_broker
PACT_BROKER_PASSWORD=pact_broker
PACT_BROKER_TOKEN=<optional-api-token>
```

### GitHub Actions Integration

The contract tests are integrated into the existing CI/CD pipeline:

```yaml
# Consumer tests run first
contract-tests-consumer:
  runs-on: ubuntu-latest
  steps:
    - name: Run consumer contract tests
      run: npm run test:contracts:consumer

# Provider tests run after consumer tests complete
contract-tests-provider:
  needs: [contract-tests-consumer]
  steps:
    - name: Run provider contract verification
      run: npm run test:contracts:provider
```

## Best Practices

### Contract Design

1. **Keep contracts minimal**: Only test what the consumer actually uses
2. **Use realistic data**: Test with data that represents real scenarios
3. **Test error cases**: Include tests for various error responses
4. **Version contracts**: Use semantic versioning for breaking changes

### Test Organization

1. **Group related tests**: Organize tests by API endpoint or feature
2. **Use descriptive names**: Make test intentions clear
3. **Maintain test data**: Keep test data separate and reusable
4. **Document assumptions**: Clearly state what each test validates

### Maintenance

1. **Review contracts regularly**: Ensure contracts reflect current usage
2. **Update together**: Keep consumer and provider tests in sync
3. **Monitor broker**: Check contract broker for health and usage
4. **Clean up old versions**: Remove obsolete contract versions

## Troubleshooting

### Common Issues

**Contract verification fails:**
- Check that provider state handlers are properly implemented
- Verify that test data matches contract expectations
- Ensure provider server is running and accessible

**Consumer tests fail:**
- Verify mock server configuration
- Check that request/response formats match
- Ensure all required fields are included in matchers

**Pact Broker connection issues:**
- Verify broker URL and credentials
- Check network connectivity
- Ensure broker service is running

**CI/CD pipeline failures:**
- Review pipeline logs for specific error messages
- Verify environment variables are set correctly
- Check that artifacts are properly uploaded/downloaded

### Debugging Tips

1. **Enable verbose logging:**
   ```bash
   PACT_LOG_LEVEL=debug npm run test:contracts:consumer
   ```

2. **Check generated pact files:**
   ```bash
   cat contracts/pacts/*.json | jq .
   ```

3. **Verify provider manually:**
   ```bash
   curl -X GET http://localhost:3000/api/v1/artifacts
   ```

## Examples

### Complete API Contract Example

See the following files for complete examples:
- `contracts/consumer/artifacts.pact.spec.js` - Consumer test example
- `contracts/provider/artifacts.provider.spec.js` - Provider verification example

### Custom Matchers

```javascript
const customMatchers = {
  uuid: () => ({
    match: 'regex',
    regex: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    example: '12345678-1234-1234-1234-123456789012'
  }),
  
  timestamp: () => ({
    match: 'regex',
    regex: '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}',
    example: '2023-01-01T00:00:00Z'
  }),
  
  positiveInteger: (example) => ({
    match: 'integer',
    min: 1,
    example: example || 1
  })
};
```

### Error Handling

```javascript
// Test error responses
await provider.addInteraction({
  state: 'resource does not exist',
  uponReceiving: 'a request for non-existent resource',
  withRequest: {
    method: 'GET',
    path: '/api/v1/artifacts/999',
  },
  willRespondWith: {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
    body: {
      success: false,
      error: 'Artifact not found',
      code: 'RESOURCE_NOT_FOUND'
    },
  },
});
```

## Resources

- [Pact Documentation](https://docs.pact.io/)
- [Contract Testing Best Practices](https://docs.pact.io/best_practices)
- [Pact Broker Documentation](https://docs.pact.io/pact_broker)
- [Consumer-Driven Contract Testing](https://martinfowler.com/articles/consumerDrivenContracts.html)