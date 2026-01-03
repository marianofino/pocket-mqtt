# @pocket-mqtt/api

Fastify plugins and routes for the PocketMQTT REST API.

## Install

```bash
pnpm add @pocket-mqtt/api
```

## Quick use

```typescript
import { createAPIServer } from '@pocket-mqtt/api';
import { getDbClient, createDeviceRepository, createMessageRepository } from '@pocket-mqtt/db';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';

const db = getDbClient();
const telemetry = new TelemetryService(createMessageRepository(db));
await telemetry.start();

const server = await createAPIServer({
  port: 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  deviceRepository: createDeviceRepository(db),
  telemetryService: telemetry
});

await server.listen({ port: 3000 });
```

## Endpoints

- `GET /health` (public)
- `POST /api/v1/auth/login`
- `POST /api/v1/telemetry` (JWT)
- `GET /api/v1/telemetry` (JWT)
- `POST /api/devices` (JWT)
- `GET /api/devices` (JWT)
- `GET /api/devices/:id` (JWT)
- `PATCH /api/devices/:id` (JWT)
- `DELETE /api/devices/:id` (JWT)
- `POST /api/devices/:id/regenerate-token` (JWT)

Depends on `@pocket-mqtt/db`, `@pocket-mqtt/telemetry-service`, and `@pocket-mqtt/core`. See `ARCHITECTURE.md` for the API-first rule.
