# @pocket-mqtt/api

Fastify plugins and routes for PocketMQTT REST API.

## Overview

REST API library providing endpoints for telemetry, device management, tenant management, and user management.

## Features

- **JWT Authentication**: Secure token-based authentication
- **Telemetry Endpoints**: Query and submit telemetry data
- **Device Management**: CRUD operations for devices and token regeneration
- **Tenant Management**: Multi-tenancy support
- **User Management**: User CRUD and authentication
- **Type-Safe Routes**: Full TypeScript support with Zod validation

## Installation

```bash
pnpm add @pocket-mqtt/api
```

## Usage

```typescript
import { createAPIServer } from '@pocket-mqtt/api';
import { getDbClient, createDeviceRepository, createMessageRepository } from '@pocket-mqtt/db';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';

const db = getDbClient();
const deviceRepo = createDeviceRepository(db);
const messageRepo = createMessageRepository(db);

const telemetryService = new TelemetryService(messageRepo);
await telemetryService.start();

const server = await createAPIServer({
  port: 3000,
  jwtSecret: process.env.JWT_SECRET || 'your-secret',
  deviceRepository: deviceRepo,
  telemetryService
});

await server.listen({ port: 3000 });
console.log('API server running on port 3000');
```

## Endpoints

- `GET /health` - Health check (public)
- `POST /api/v1/auth/login` - Generate JWT token
- `POST /api/v1/telemetry` - Submit telemetry (JWT required)
- `GET /api/v1/telemetry` - Query telemetry (JWT required)
- `POST /api/devices` - Create device (JWT required)
- `GET /api/devices` - List devices (JWT required)
- `GET /api/devices/:id` - Get device (JWT required)
- `PATCH /api/devices/:id` - Update device (JWT required)
- `DELETE /api/devices/:id` - Delete device (JWT required)
- `POST /api/devices/:id/regenerate-token` - Regenerate device token (JWT required)

## Dependencies

- `@pocket-mqtt/core` - Core utilities
- `@pocket-mqtt/db` - Database repositories
- `@pocket-mqtt/telemetry-service` - Telemetry service
- `fastify` - Web framework
- `@fastify/jwt` - JWT authentication plugin

## Scripts

- `pnpm build` - Compile TypeScript
- `pnpm clean` - Remove build artifacts
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
