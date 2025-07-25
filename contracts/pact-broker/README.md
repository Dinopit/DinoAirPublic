# Pact Broker Setup

This directory contains the configuration for running a local Pact Broker for contract testing.

## Quick Start

1. **Start the Pact Broker:**
   ```bash
   cd contracts/pact-broker
   docker-compose up -d
   ```

2. **Access the Pact Broker:**
   - Open your browser to [http://localhost:9292](http://localhost:9292)
   - Default credentials: `pact_broker` / `pact_broker`

3. **Stop the Pact Broker:**
   ```bash
   docker-compose down
   ```

## Configuration

The Pact Broker is configured with:
- **Database**: PostgreSQL 15
- **Authentication**: Basic auth (username: `pact_broker`, password: `pact_broker`)
- **Public read access**: Enabled for easier testing
- **Port**: 9292

## Environment Variables

For production use, update these environment variables:

```bash
PACT_BROKER_BASE_URL=http://localhost:9292
PACT_BROKER_USERNAME=pact_broker
PACT_BROKER_PASSWORD=pact_broker
```

## Persistent Data

Contract data is persisted in a Docker volume (`pact_postgres_data`). To reset all contracts:

```bash
docker-compose down -v
docker-compose up -d
```

## Production Deployment

For production, consider:
1. Using strong authentication credentials
2. Setting up HTTPS/TLS
3. Using a managed PostgreSQL instance
4. Setting up proper backup strategies
5. Configuring webhooks for CI/CD integration

## Troubleshooting

1. **Port conflicts**: If port 9292 is in use, update the port mapping in `docker-compose.yml`
2. **Database connection issues**: Ensure PostgreSQL container is healthy
3. **Permission issues**: Ensure Docker has proper permissions to create volumes