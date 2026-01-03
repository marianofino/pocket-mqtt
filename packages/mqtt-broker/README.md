# @pocket-mqtt/mqtt-broker

Aedes-based broker with device-token auth and telemetry ingestion via TelemetryService.

## Install

```bash
pnpm add @pocket-mqtt/mqtt-broker
```

## Quick use

```typescript
import { MQTTServer } from '@pocket-mqtt/mqtt-broker';
import { TelemetryService } from '@pocket-mqtt/telemetry-service';
import { getDbClient, createMessageRepository, createDeviceRepository } from '@pocket-mqtt/db';

const db = getDbClient();
const telemetry = new TelemetryService(createMessageRepository(db));
await telemetry.start();

const mqttServer = new MQTTServer({
  port: 1883,
  deviceRepository: createDeviceRepository(db),
  telemetryService: telemetry
});

await mqttServer.start();
```

Clients must use `username=deviceId` and `password=deviceToken`. Depends on `@pocket-mqtt/db`, `@pocket-mqtt/telemetry-service`, `@pocket-mqtt/core`, and `aedes`.
