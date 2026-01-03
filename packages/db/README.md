# @pocket-mqtt/db

Single home for Drizzle schemas, repositories, and migrations (SQLite default, Postgres optional).

## Install

```bash
pnpm add @pocket-mqtt/db
```

## Quick use

```typescript
import { getDbClient, createMessageRepository } from '@pocket-mqtt/db';

const db = getDbClient();
const messages = createMessageRepository(db); // picks driver via DB_ADAPTER
await messages.insert({ topic: 'sensor/temp', payload: '25.5' });
```

## Setup

- SQLite (default): `pnpm db:push`
- Postgres: `export DB_ADAPTER=postgres && export DATABASE_URL=postgresql://...` then `pnpm db:push`

Artifacts live here: `drizzle.config*.ts`, `drizzle/` (SQLite), `drizzle-pg/` (Postgres).

See `ARCHITECTURE.md` for design decisions and repository pattern notes.
