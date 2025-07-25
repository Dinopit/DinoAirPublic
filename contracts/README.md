# Contract Testing with Pact

This directory contains the contract testing setup for the DinoAir application using [Pact](https://pact.io/).

## Overview

Contract testing ensures that services can communicate correctly by testing the interactions between consumer and provider services. This prevents integration issues and enables confident independent deployments.

## Structure

```
contracts/
├── README.md                 # This file
├── pact-broker/             # Pact broker configuration
├── consumer/                # Consumer contract tests (frontend)
│   ├── artifacts.pact.spec.js
│   ├── models.pact.spec.js
│   └── personalities.pact.spec.js
├── provider/                # Provider contract tests (backend)
│   ├── artifacts.provider.spec.js
│   ├── models.provider.spec.js
│   └── personalities.provider.spec.js
└── config/                  # Shared configuration
    ├── pact.config.js
    └── setup.js
```

## Key Concepts

- **Consumer**: The service that makes HTTP requests (frontend)
- **Provider**: The service that responds to HTTP requests (backend)
- **Contract**: A formal specification of the interactions between consumer and provider
- **Pact Broker**: A centralized service for storing and managing contracts

## APIs Under Contract

### 1. Artifacts API (`/api/v1/artifacts`)
- GET `/api/v1/artifacts` - List artifacts with pagination and filtering
- GET `/api/v1/artifacts/:id` - Get specific artifact
- POST `/api/v1/artifacts` - Create new artifact
- PUT `/api/v1/artifacts/:id` - Update artifact
- DELETE `/api/v1/artifacts/:id` - Delete artifact

### 2. Models API (`/api/v1/models`)
- GET `/api/v1/models` - List model configurations
- GET `/api/v1/models/:id` - Get specific model
- POST `/api/v1/models` - Add new model configuration
- PUT `/api/v1/models/:id` - Update model configuration
- DELETE `/api/v1/models/:id` - Remove model configuration

### 3. Personalities API (`/api/v1/personalities`)
- GET `/api/v1/personalities` - List personalities
- GET `/api/v1/personalities/:id` - Get specific personality
- POST `/api/v1/personalities` - Create new personality
- PUT `/api/v1/personalities/:id` - Update personality
- DELETE `/api/v1/personalities/:id` - Delete personality

## Running Tests

### Consumer Tests (Frontend)
```bash
cd web-gui
npm run test:contracts:consumer
```

### Provider Tests (Backend)
```bash
cd web-gui-node
npm run test:contracts:provider
```

### Full Contract Testing Workflow
```bash
# Run consumer tests to generate contracts
npm run contracts:consumer

# Publish contracts to broker
npm run contracts:publish

# Run provider tests to verify contracts
npm run contracts:verify
```

## CI/CD Integration

Contract tests are integrated into the CI/CD pipeline:

1. **Consumer tests** run during frontend PR builds
2. **Contract publication** happens on merge to main
3. **Provider verification** runs during backend PR builds
4. **Contract compatibility** is checked before deployment

## Best Practices

1. **Keep contracts minimal** - Only test what you actually use
2. **Use realistic data** - Test with data that represents real usage
3. **Test error scenarios** - Include tests for error responses
4. **Version your contracts** - Use semantic versioning for breaking changes
5. **Document changes** - Keep contract changes well documented