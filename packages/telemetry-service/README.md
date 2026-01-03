# @pocket-mqtt/telemetry-service

Buffers telemetry in-memory and flushes to the database in batches (every 2s or 100 messages).

## Install

```bash
pnpm add @pocket-mqtt/telemetry-service
```

## Quick use

```typescript
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { getDbClient, createMessageRepository } from '@pocket-mqtt/db';

const db = getDbClient();
const messages = createMessageRepository(db);
const telemetry = new TelemetryService(messages);

await telemetry.start();
telemetry.buffer({ topic: 'sensor/temp', payload: '25.5', tenantId: 't1', deviceId: 'd1' });
await telemetry.stop();
```

Depends on `@pocket-mqtt/db` and `@pocket-mqtt/core`. See batching rules in `ARCHITECTURE.md`.
