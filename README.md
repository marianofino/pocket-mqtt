# PocketMQTT

A lightweight, API-first IoT platform with MQTT broker and REST API in a modern pnpm monorepo structure.

## Features

- 🚀 **MQTT Broker**: Aedes-based MQTT broker on port 1883
- 🌐 **REST API**: Fastify-based API on port 3000
- 🔒 **Security**: JWT authentication for REST API, Device token validation for MQTT
- ✅ **Validation**: Zod schema validation for MQTT payloads (rejects malformed messages)
- 📊 **Telemetry Storage**: Efficient data persistence with batching (2s interval, >1000 msg/min capacity)
- 💾 **Multi-DB Support**: SQLite (WAL mode) or PostgreSQL via Repository Pattern
- 🏗️ **Repository Pattern**: Abstract database operations for easy DB switching
- 📦 **ESM + TypeScript**: Modern JavaScript with full type safety
- 🧪 **TDD-Enabled**: Vitest for testing with built-in coverage
- ⚡ **Monorepo**: Organized pnpm workspace with reusable packages
- 🔧 **Two Deployment Modes**: Full platform (API + Broker) or standalone broker

## Requirements

- Node.js v24 or higher (v20+ will work but shows warnings)
- pnpm v10+

## Installation

```bash
pnpm install
```

## Monorepo Structure

```
pocket-mqtt/
├── packages/              # Reusable packages
│   ├── core/             # Core utilities, types, validation
│   ├── db/               # Database schemas, repositories, Drizzle config
│   ├── telemetry-service/ # Telemetry buffering and flushing service
│   ├── mqtt-broker/      # MQTT broker library (Aedes + auth hooks)
│   └── api/              # Fastify plugins, routes, and services
├── apps/                 # Executable applications
│   ├── api/              # REST API + MQTT broker (full platform)
│   └── broker/           # Standalone MQTT broker (MQTT→DB only)
└── tsconfig.base.json    # Shared TypeScript configuration
```

## Database Setup

The platform uses Drizzle ORM with **SQLite (default)** or **PostgreSQL** for telemetry storage:

### SQLite (Default)
```bash
# Push schema to SQLite database
pnpm db:push
```

Default SQLite path (used by migrations and examples): `file:./packages/db/dev.db`

### PostgreSQL (Optional)
```bash
# Set environment variables
export DB_ADAPTER=postgres
export DATABASE_URL="postgresql://username:password@localhost:5432/pocket_mqtt"

# Create database
createdb pocket_mqtt

# Apply PostgreSQL migrations (from packages/db)
psql -d pocket_mqtt -f packages/db/drizzle-pg/0000_initial.sql
```

See `packages/db/drizzle-pg/README.md` for detailed PostgreSQL setup instructions.

## Development

### Run Both API and Broker Together
```bash
# Start both services with hot reload
pnpm dev:all
```

### Run Services Individually
```bash
# Run API only (includes telemetry service)
pnpm dev:api

# Run MQTT broker only
pnpm dev:broker
```

### Build All Packages
```bash
# Build all packages and apps
pnpm build

# Build specific package
pnpm --filter @pocket-mqtt/db build
```

### Production

```bash
# Build everything
pnpm build

# Start API
pnpm start:api

# Start broker
pnpm start:broker
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests in specific package
pnpm --filter @pocket-mqtt/db test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

## Packages

### @pocket-mqtt/core
Core utilities, types, and validation schemas used across all packages.
- Token generation
- Tenant utilities
- MQTT payload validation (Zod schemas)

### @pocket-mqtt/db
Database layer with Drizzle ORM support for SQLite and PostgreSQL.
- Schema definitions (SQLite and PostgreSQL)
- Repository pattern implementations
- Database connection management
- Migrations via Drizzle Kit

### @pocket-mqtt/telemetry-service
Telemetry buffering and batch persistence service.
- In-memory message buffering
- Automatic flushing (every 2s or 100 messages)
- High-throughput capable (>1000 msg/min)

### @pocket-mqtt/mqtt-broker
MQTT broker library based on Aedes with authentication hooks.
- Device token authentication
- MQTT publish handlers
- Reusable broker configuration

### @pocket-mqtt/api
Fastify-based REST API with plugins and routes.
- JWT authentication
- Telemetry endpoints
- Device management
- Tenant management
- User management

## Apps

### @pocket-mqtt/app-api
Full-featured REST API server with telemetry service.
- Exposes REST endpoints on port 3000
- Includes all services (Device, Tenant, User, Telemetry)
- JWT-based authentication
- Swagger/OpenAPI support (future)

### @pocket-mqtt/app-broker
Standalone MQTT broker for MQTT→DB ingestion without REST API.
- MQTT broker on port 1883
- Direct telemetry persistence
- Lightweight deployment option
- No REST API overhead

## Usage

### As Separate Services

### As Separate Services

```bash
# Start API server (port 3000)
pnpm start:api

# Start MQTT broker (port 1883)
pnpm start:broker

# Or in development with hot reload
pnpm dev:all  # Both together
pnpm dev:api  # API only
pnpm dev:broker  # Broker only
```

### As a Library

You can import individual packages in your own projects:

```typescript
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { MQTTServer } from '@pocket-mqtt/mqtt-broker';
import { APIServer } from '@pocket-mqtt/api';
import { getDbClient } from '@pocket-mqtt/db';
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
