# @pocket-mqtt/core

Core utilities, configuration, and types for PocketMQTT.

## Overview

Foundation package providing shared utilities, validation schemas, and type definitions used across the monorepo.

## Features

- **Token Generation**: Cryptographically secure device token generation
- **Tenant Utilities**: Multi-tenancy helper functions
- **MQTT Payload Validation**: Zod schemas for MQTT message validation
- **Shared Types**: Common TypeScript types and interfaces

## Installation

```bash
pnpm add @pocket-mqtt/core
```

## Usage

```typescript
import { generateDeviceToken } from '@pocket-mqtt/core/utils/token-generator';
import { mqttPayloadSchema } from '@pocket-mqtt/core/validation/mqtt';

// Generate a secure device token
const token = generateDeviceToken(); // e.g., "a3f2-b5d9-c8e1"

// Validate MQTT payload
const result = mqttPayloadSchema.safeParse(payload);
```

## Dependencies

This package has **no internal dependencies** and sits at the base of the dependency tree.

## Scripts

- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm clean` - Remove build artifacts
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
