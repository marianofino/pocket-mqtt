# @pocket-mqtt/mqtt-broker

MQTT broker library with authentication hooks for PocketMQTT.

## Overview

Aedes-based MQTT broker with device token authentication and automatic telemetry persistence.

## Features

- **MQTT 3.1.1 & 5.0 Support**: Full Aedes protocol support
- **Device Token Authentication**: Validates device credentials on connection
- **Authorization Hooks**: Extensible publish/subscribe permissions
- **Automatic Telemetry Ingestion**: Routes messages to TelemetryService
- **Reusable Library**: Can be embedded in any Node.js application

## Installation

```bash
pnpm add @pocket-mqtt/mqtt-broker
```

## Usage

```typescript
import { MQTTServer } from '@pocket-mqtt/mqtt-broker';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { getDbClient, createMessageRepository, createDeviceRepository } from '@pocket-mqtt/db';

const db = getDbClient();
const messageRepo = createMessageRepository(db);
const deviceRepo = createDeviceRepository(db);

const telemetryService = new TelemetryService(messageRepo);
await telemetryService.start();

const mqttServer = new MQTTServer({
  port: 1883,
  deviceRepository: deviceRepo,
  telemetryService
});

await mqttServer.start();
console.log('MQTT broker running on port 1883');
```

## Authentication

All MQTT connections require valid device credentials:
- **Username**: Device ID
- **Password**: Device token (from DeviceToken table)

## Dependencies

- `@pocket-mqtt/core` - Core utilities
- `@pocket-mqtt/db` - Device repository
- `@pocket-mqtt/telemetry-service` - Telemetry buffering
- `aedes` - MQTT broker engine

## Scripts

- `pnpm build` - Compile TypeScript
- `pnpm clean` - Remove build artifacts
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
