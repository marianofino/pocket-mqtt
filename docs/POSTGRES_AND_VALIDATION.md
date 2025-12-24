# PostgreSQL Support and Zod Validation

This document explains how to use the PostgreSQL adapter and Zod validation features.

## Database Adapter Configuration

### Using SQLite (Default)

SQLite is the default adapter and requires minimal configuration:

```bash
# .env
DATABASE_URL="file:./dev.db"
DATABASE_ADAPTER="sqlite"
```

### Using PostgreSQL

To use PostgreSQL, set the `DATABASE_ADAPTER` environment variable to either `postgres` or `postgresql` and provide a PostgreSQL connection string:

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/pocketmqtt"
DATABASE_ADAPTER="postgres" # or "postgresql"
```

## Repository Pattern

The application uses the Repository Pattern to abstract database operations. This allows for:

- Database-agnostic code
- Easier testing with mock repositories
- Cleaner separation of concerns

### Usage Example

```typescript
import { getRepository } from './database.js';

// Get repository instance
const repository = getRepository();

// Telemetry operations
await repository.telemetry.createMany([
  { topic: 'sensor/temp', payload: '{"value": 25}', timestamp: new Date() }
]);

const records = await repository.telemetry.findMany({
  topic: 'sensor/temp',
  limit: 10,
  offset: 0,
  orderBy: 'timestamp',
  orderDirection: 'desc'
});

const count = await repository.telemetry.count({ topic: 'sensor/temp' });

// Device token operations
const token = await repository.deviceToken.findByToken('token123');
const newToken = await repository.deviceToken.create({
  deviceId: 'device1',
  token: 'secure-token',
  expiresAt: new Date(Date.now() + 86400000)
});
```

## Zod Validation

All MQTT payloads are validated using Zod schemas before being buffered. Invalid payloads are automatically discarded with a warning log.

### Validation Rules

- `topic` must be a non-empty string
- `payload` must be a non-empty string

### Example

```typescript
// Valid payload - will be buffered
await telemetryService.addMessage('sensor/temperature', '{"value": 25.5}');

// Invalid payload - will be discarded
await telemetryService.addMessage('', '{"value": 25.5}'); // Empty topic
await telemetryService.addMessage('sensor/temp', ''); // Empty payload
```

## Migration Guide

### Migrating from SQLite to PostgreSQL

1. **Create a PostgreSQL database:**
   ```bash
   createdb pocketmqtt
   ```

2. **Update environment variables:**
   ```bash
   DATABASE_URL="postgresql://localhost:5432/pocketmqtt"
   DATABASE_ADAPTER="postgres"
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```

### Switching Back to SQLite

Simply update the environment variables:

```bash
DATABASE_URL="file:./dev.db"
DATABASE_ADAPTER="sqlite"
```

Run migrations and regenerate the Prisma client:

```bash
npm run db:migrate
npm run db:generate
```

## Testing

The test suite includes tests for:

- Zod validation (valid and invalid payloads)
- Repository Pattern operations
- Database adapter selection
- Integration with TelemetryService

Run tests with:

```bash
npm test
```

## Performance Considerations

- **SQLite**: Uses WAL (Write-Ahead Logging) mode for better concurrent I/O
- **PostgreSQL**: Connection pooling is automatically configured via `pg.Pool`
- Both adapters support the same batching and buffering strategy (2s or 100 messages)
