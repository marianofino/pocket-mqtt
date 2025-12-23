# PocketMQTT

A lightweight, API-first IoT platform with MQTT broker and REST API running in a single Node.js process.

## Features

- 🚀 **MQTT Broker**: Aedes-based MQTT broker on port 1883
- 🌐 **REST API**: Fastify-based API on port 3000
- 📊 **Telemetry Storage**: Efficient data persistence with batching (2s interval, >1000 msg/min capacity)
- 💾 **SQLite WAL Mode**: Concurrent I/O for high-performance writes
- 📦 **ESM + TypeScript**: Modern JavaScript with full type safety
- 🧪 **TDD-Enabled**: Vitest for testing with built-in coverage
- ⚡ **Single Process**: Both services in one lightweight process

## Requirements

- Node.js v24 or higher

## Installation

```bash
npm install
```

## Database Setup

The platform uses Prisma with SQLite (WAL mode) for telemetry storage:

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production build
npm start
```

## Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Usage

### As a Module

```typescript
import { PocketMQTT } from 'pocket-mqtt';

const app = new PocketMQTT({
  mqttPort: 1883,
  apiPort: 3000
});

await app.start();
```

### Standalone

```bash
npm start
```

## API Endpoints

### Health
- `GET /health` - Health check endpoint

### Telemetry
- `POST /api/v1/telemetry` - Submit telemetry data
  - Body: `{ "topic": "sensor/temp", "payload": "25.5" }`
  - Response: `{ "success": true, "message": "Telemetry data buffered" }`

- `GET /api/v1/telemetry` - Retrieve telemetry data
  - Query params: `topic`, `limit` (default 100), `offset` (default 0)
  - Response: `{ "data": [...], "pagination": { "total": 100, "limit": 100, "offset": 0 } }`

## MQTT

Connect to the MQTT broker on port 1883:

```bash
mqtt://localhost:1883
```

All published messages (except system topics starting with `$`) are automatically buffered and persisted to the database in batches every 2 seconds or when 100 messages are buffered.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions and technical details.

## Contributing

Follow TDD workflow:
1. Write failing test (Red)
2. Implement minimal code (Green)
3. Refactor (Refactor)

See [AGENTS.md](./AGENTS.md) for development guidelines.

## License

ISC
