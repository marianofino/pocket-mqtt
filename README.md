# PocketMQTT

Lightweight, API-first IoT platform with an MQTT broker and REST API in a pnpm monorepo.

## Requirements

- Node.js v20+ (v24 recommended)
- pnpm v10+

## Quickstart (5 minutes)

```bash
pnpm install              # install workspace deps
pnpm dev:all              # run API + broker with hot reload
pnpm test                 # run all tests (Vitest workspace)
```

For database setup (SQLite default, PostgreSQL optional) see `packages/db/README.md`.

## Monorepo at a glance

```
packages/  core | db | telemetry-service | mqtt-broker | api
apps/      api  | mqtt-broker
```

- `packages/core` – shared utilities, types, validation
- `packages/db` – Drizzle schemas + repositories (SQLite/Postgres)
- `packages/telemetry-service` – buffer + batch flush
- `packages/mqtt-broker` – Aedes-based broker with auth hooks
- `packages/api` – Fastify plugins, routes, services
- `apps/api` – full API server
- `apps/mqtt-broker` – standalone broker

## Run

```bash
pnpm dev:api          # API + telemetry
pnpm dev:mqtt-broker  # MQTT broker only
pnpm build            # build all packages/apps
pnpm start:api        # production API
pnpm start:mqtt-broker
```

## API + MQTT

- REST endpoints: see `packages/api/README.md` for the endpoint list.
- MQTT Authentication: Two modes supported:
  - **Legacy:** `username=deviceId`, `password=deviceToken`
  - **Single-Credential (New):** `username=deviceToken` (no password) - simpler provisioning!

## Architecture & decisions

See `ARCHITECTURE.md` for stack, dependency graph, data flow, performance rules, and the API-first mandate.

## Examples

Hands-on scripts live in `examples/` (REST client, MQTT publisher/subscriber, device setup, single-credential auth). See `examples/README.md` for the flow.

## Contributing

- TDD: Red → Green → Refactor
- Follow `AGENTS.md` for coding rules and doc scope

## License

ISC
