# PocketMQTT

A lightweight, API-first IoT platform with MQTT broker and REST API running in a single Node.js process.

## Features

- 🚀 **MQTT Broker**: Aedes-based MQTT broker on port 1883
- 🌐 **REST API**: Fastify-based API on port 3000
- 🔒 **Security**: JWT authentication for REST API, Device token validation for MQTT
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

The platform uses Drizzle ORM with SQLite (WAL mode) for telemetry storage:

```bash
# Generate migrations (if schema changes)
npm run db:generate

# Push schema to database
npm run db:push
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
- `GET /health` - Health check endpoint (public, no authentication)

### Authentication
- `POST /api/v1/auth/login` - Generate JWT token
  - Body: `{ "username": "admin", "password": "admin123" }`
  - Response: `{ "token": "eyJhbGc..." }`

### Telemetry (Protected - Requires JWT)
- `POST /api/v1/telemetry` - Submit telemetry data
  - Headers: `Authorization: Bearer <jwt_token>`
  - Body: `{ "topic": "sensor/temp", "payload": "25.5" }`
  - Response: `{ "success": true, "message": "Telemetry data buffered" }`

- `GET /api/v1/telemetry` - Retrieve telemetry data
  - Headers: `Authorization: Bearer <jwt_token>`
  - Query params: `topic`, `limit` (default 100), `offset` (default 0)
  - Response: `{ "data": [...], "pagination": { "total": 100, "limit": 100, "offset": 0 } }`

## MQTT

Connect to the MQTT broker on port 1883 with device credentials:

```bash
mqtt://localhost:1883
# Username: <device_id>
# Password: <device_token>
```

### Device Authentication
All MQTT connections require valid device credentials:
- **Username**: Device ID (e.g., "sensor-001")
- **Password**: Device token (stored in DeviceToken table)

To create a device token, insert a record in the `DeviceToken` table:
```sql
INSERT INTO DeviceToken (deviceId, token) VALUES ('sensor-001', 'your-secure-token-here');
```

All published messages (except system topics starting with `$`) are automatically buffered and persisted to the database in batches every 2 seconds or when 100 messages are buffered.

## Security

### REST API Security
- **JWT Authentication**: All telemetry endpoints require a valid JWT token
- **Token Expiration**: Tokens expire after 1 hour
- **Demo Credentials**: username: `admin`, password: `admin123` (change in production)
- **Configuration**: Set `JWT_SECRET` environment variable for production

### MQTT Security  
- **Device Token Authentication**: All MQTT connections require valid device credentials
- **Token Validation**: Tokens are validated against the database on connection
- **Token Expiration**: Optional token expiration support via `expiresAt` field
- **Authorization**: Authenticated devices can publish to any topic (extensible for topic-based permissions)

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
