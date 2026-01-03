# Architecture: "Pocket IoT"

## 1. Stack

- **Engine:** Node.js (v20+) + Fastify
- **Broker:** Aedes (integrated)
- **ORM:** Drizzle ORM (SQLite by default / PostgreSQL via ENV)
- **Validation:** Zod for MQTT payloads
- **Testing:** Vitest workspace
- **Linting/Formatting:** ESLint + Prettier
- **Security:** JWT (REST) + Device Token (MQTT)
- **Package Manager:** pnpm workspace
- **Build:** TypeScript with composite references

## 2. Project Structure (Monorepo)

```
packages/  core | db | telemetry-service | mqtt-broker | api
apps/      api  | mqtt-broker
```

Shared `config/tsconfig/base.json` defines `@pocket-mqtt/*` aliases. Packages are reusable libraries; apps are runnable entrypoints. Two deployment modes: full platform (API) or standalone broker.

## 3. Package Dependencies

```
core
  ↓
db
  ↓
telemetry-service
  ↓
mqtt-broker, api
  ↓
apps/api, apps/mqtt-broker
```

## 4. Data Flow

1. **Ingestion:** MQTT Topic -> Zod Validation -> Memory Buffer (via TelemetryService).
2. **Batching:** Flush buffer to DB every 2s or 100 messages via Repository Pattern.
3. **API:** Fastify exposes `/telemetry`, `/devices`, `/tenants`, `/users` and `/auth` for history, management, and control.

## 5. Drizzle ORM (single home: `packages/db`)

- Schemas: `src/db/schema.ts` (SQLite), `src/db/schema.pg.ts` (PostgreSQL)
- Configs: `drizzle.config.ts`, `drizzle.config.pg.ts`
- Migrations: `drizzle/` (SQLite), `drizzle-pg/` (PostgreSQL)
- Management: run via `pnpm --filter @pocket-mqtt/db ...`

## 6. Key Decisions

- **API-first:** Devices can be managed and telemetry can be read via REST endpoints.
- **Multi-DB:** Repository pattern abstracts SQLite (default) and Postgres (`DB_ADAPTER=postgres`).
- **Validation:** Zod rejects malformed MQTT payloads early.
- **Auth:** Device-token for MQTT; JWT for REST.
- **Performance:** SQLite WAL; Postgres pooling; telemetry batching (2s/100 msgs) in TelemetryService.
- **TypeScript:** Strict + composite project refs with shared aliases.

## 7. Repository Pattern

- Interfaces: `MessageRepository`, `DeviceRepository`, `TenantRepository`, `UserRepository`
- Implementations: SQLite (`better-sqlite3`) and Postgres (`postgres.js`)
- Factories: `create*Repository` choose implementation via `DB_ADAPTER`
- Location: `packages/db/src/repositories/`

## 8. Unified Configuration Approach

- **TypeScript (`config/tsconfig/base.json`):** single source of truth, strict + composite refs, aliases
- **ESLint (`.eslintrc.json`):** root config for TS/Node
- **Prettier (`.prettierrc.json`):** shared formatting
- **Vitest (`config/vitest/workspace.ts` + `config/vitest/base.ts`):** shared test defaults, sequential to avoid DB conflicts

## 9. Package Hygiene and Structure

All packages follow consistent standards:
- **ESM Only**: `"type": "module"` in all package.json files
- **Exports**: Proper `main`, `types`, and `exports` fields for package consumers
- **Files Field**: Explicit control over published content (dist, configs, README)
- **Engines**: Node.js >=24.0.0 requirement across all packages
- **Clean Scripts**: Individual and root-level clean commands for build artifacts
- **Dependencies**: Only listed where used; workspace packages use `workspace:*` protocol
- **Peer Dependencies**: Used for optional or consumer-provided dependencies (e.g., dotenv, zod)
- **Documentation**: Each package has a focused README explaining purpose, usage, and dependencies

## 9. Security Implementation

### MQTT Security (Device Token Authentication)

- **Authentication Hook:** Validates device tokens on MQTT connection (implemented in `src/broker/authentication.ts`)
  - **Two Authentication Modes:**
    1. **Legacy Mode:** `username=deviceId`, `password=token` (backward compatible)
    2. **Single-Credential Mode:** `username=token`, no password (new feature)
  - Tokens are auto-generated short unique identifiers (format: xxxx-yyyy-zzzz)
  - Tokens are stored in the `DeviceToken` table with salted hash (scrypt) and HMAC lookup key
  - **Token Storage:**
    - `tokenHash`: Salted scrypt hash for verification (prevents rainbow table attacks)
    - `tokenLookup`: HMAC-SHA256(secret_key, token) for efficient device lookup in single-credential mode
    - `TOKEN_LOOKUP_SECRET` environment variable is **required in production** for security
  - Expired tokens are automatically rejected
  - Unauthorized connections are refused
  - **Internal DeviceId:** Stable identifier maintained for audit logs, ACLs, and topic resolution
  - **Migration Note:** Existing devices from pre-tokenLookup versions need token regeneration to use single-credential mode

- **Authorization Hook:** Controls publish permissions
  - Currently allows all authenticated devices to publish
  - Extensible for topic-based permissions

### REST API Security (JWT Authentication)

- **JWT Plugin:** `@fastify/jwt` for token generation and verification (configured in `src/api/server.ts`)
- **Protected Endpoints:**
  - `POST /api/v1/telemetry` - Requires valid JWT
  - `GET /api/v1/telemetry` - Requires valid JWT
  - `POST /api/devices` - Requires valid JWT
  - `GET /api/devices` - Requires valid JWT
  - `GET /api/devices/:id` - Requires valid JWT
  - `POST /api/devices/:id/regenerate-token` - Requires valid JWT
  - `PATCH /api/devices/:id` - Requires valid JWT
  - `DELETE /api/devices/:id` - Requires valid JWT
- **Public Endpoints:**
  - `GET /health` - Health check (no auth)
  - `POST /api/v1/auth/login` - JWT token generation
- **Token Configuration:**
  - Secret: Configurable via `JWT_SECRET` environment variable or config
  - Expiration: 1 hour (configurable)
  - Algorithm: HS256 (default)

## 10. Device Management

- **Auto-Generated Tokens:** Each device gets a unique token (xxxx-yyyy-zzzz format, 14 chars)
  - Uses cryptographically secure random bytes (48 bits of entropy)
  - Collision-resistant even with hundreds of thousands of devices
  - Tokens can be regenerated/reset manually via API
  - Token generation is in `src/core/utils/token-generator.ts`
  - **Token Rotation:** When tokens are regenerated, the stable `deviceId` remains unchanged
- **Device Metadata:**
  - `deviceId` (auto-generated): Stable internal identifier for audit logs and ACLs
  - `name` (required): Human-readable device name for identification
  - `labels` (optional): Array of labels for filtering and queries
  - `notes` (optional): Free text field for comments or notes
- **DeviceService:** Business logic layer handling device CRUD operations and token management (`src/api/services/DeviceService.ts`)
- **Device API:** RESTful endpoints for device lifecycle management (`src/api/routes/device.routes.ts`)
