# @pocket-mqtt/db

Database schemas, repositories, and migrations for PocketMQTT.

## Overview

Single source of truth for all database operations, supporting both SQLite and PostgreSQL through the Repository Pattern.

## Features

- **Drizzle ORM Integration**: Type-safe database queries
- **Multi-Database Support**: SQLite (default) and PostgreSQL
- **Repository Pattern**: Abstract database operations for easy switching
- **Schema Management**: All Drizzle schemas and configurations consolidated here
- **Migrations**: Database migration files for both SQLite and PostgreSQL

## Installation

```bash
pnpm add @pocket-mqtt/db
```

## Usage

```typescript
import { getDbClient, createMessageRepository } from '@pocket-mqtt/db';

// Get database client
const db = getDbClient();

// Create a repository (auto-selects SQLite or PostgreSQL based on DB_ADAPTER)
const messageRepo = createMessageRepository(db);

// Use repository
await messageRepo.insert({ topic: 'sensor/temp', payload: '25.5' });
```

## Database Setup

### SQLite (Default)

```bash
pnpm db:push
```

### PostgreSQL

```bash
export DB_ADAPTER=postgres
export DATABASE_URL="postgresql://user:pass@localhost:5432/pocket_mqtt"
pnpm db:push
```

## Drizzle Configuration

All Drizzle artifacts are consolidated in this package:
- `drizzle.config.ts` - SQLite configuration
- `drizzle.config.pg.ts` - PostgreSQL configuration
- `drizzle/` - SQLite migrations
- `drizzle-pg/` - PostgreSQL migrations

## Dependencies

- `@pocket-mqtt/core` - Core utilities and types
- `drizzle-orm` - ORM
- `better-sqlite3` - SQLite driver
- `postgres` - PostgreSQL driver (postgres.js)
- `pg` - PostgreSQL types

## Scripts

- `pnpm build` - Compile TypeScript
- `pnpm clean` - Remove build artifacts
- `pnpm test` - Run tests
- `pnpm db:generate` - Generate migrations from schema
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio
- `pnpm db:migrate` - Run migrations
