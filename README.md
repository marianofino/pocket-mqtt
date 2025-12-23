# PocketMQTT

A lightweight, API-first IoT platform with MQTT broker and REST API running in a single Node.js process.

## Features

- 🚀 **MQTT Broker**: Aedes-based MQTT broker on port 1883
- 🌐 **REST API**: Fastify-based API on port 3000
- 📦 **ESM + TypeScript**: Modern JavaScript with full type safety
- 🧪 **TDD-Enabled**: Vitest for testing with built-in coverage
- ⚡ **Single Process**: Both services in one lightweight process

## Requirements

- Node.js v24 or higher

## Installation

```bash
npm install
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

- `GET /health` - Health check endpoint

## MQTT

Connect to the MQTT broker on port 1883:

```bash
mqtt://localhost:1883
```

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
