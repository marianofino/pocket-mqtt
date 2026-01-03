# @pocket-mqtt/telemetry-service

Telemetry buffering and batch persistence service for PocketMQTT.

## Overview

High-throughput telemetry ingestion service with in-memory buffering and automatic batch persistence.

## Features

- **In-Memory Buffering**: Accumulates messages before database writes
- **Automatic Flushing**: Flushes every 2 seconds or when buffer reaches 100 messages
- **High Throughput**: Handles >1000 messages/minute
- **Graceful Shutdown**: Ensures buffered data is persisted on shutdown

## Installation

```bash
pnpm add @pocket-mqtt/telemetry-service
```

## Usage

```typescript
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { getDbClient, createMessageRepository } from '@pocket-mqtt/db';

const db = getDbClient();
const messageRepo = createMessageRepository(db);
const telemetryService = new TelemetryService(messageRepo);

// Start the service
await telemetryService.start();

// Buffer a message (non-blocking)
telemetryService.buffer({
  topic: 'sensor/temp',
  payload: '25.5',
  tenantId: 'tenant-123',
  deviceId: 'device-456'
});

// Graceful shutdown (flushes buffer)
await telemetryService.stop();
```

## Dependencies

- `@pocket-mqtt/core` - Core utilities
- `@pocket-mqtt/db` - Database repositories

## Scripts

- `pnpm build` - Compile TypeScript
- `pnpm clean` - Remove build artifacts
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
