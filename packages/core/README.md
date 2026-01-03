# @pocket-mqtt/core

Shared utilities, validation, and types used by all other packages. No internal dependencies.

## Install

```bash
pnpm add @pocket-mqtt/core
```

## Quick use

```typescript
import { generateDeviceToken } from '@pocket-mqtt/core/utils/token-generator';
import { mqttPayloadSchema } from '@pocket-mqtt/core/validation/mqtt-payload.schema';

const token = generateDeviceToken();
const parsed = mqttPayloadSchema.safeParse(payload);
```

For architecture and rules see the root `README.md` and `ARCHITECTURE.md`.
