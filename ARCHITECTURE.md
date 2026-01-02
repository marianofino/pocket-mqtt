# Architecture: "Pocket IoT"

## 1. Stack
- **Engine:** Node.js (v20+) + Fastify.
- **Broker:** Aedes (integrated).
- **ORM:** Drizzle ORM (SQLite by default / PostgreSQL via ENV).
- **Validation:** Zod for schema validation of MQTT payloads.
- **Testing:** Vitest + Supertest (for API testing).
- **Security:** JWT (REST API) + Device Token (MQTT).
- **Package Manager:** pnpm with workspace support.
- **Build System:** TypeScript with composite project references.

## 2. Project Structure (Monorepo)

The codebase is organized as a pnpm monorepo with packages and apps:

```
pocket-mqtt/
├── packages/              # Reusable library packages
│   ├── core/             # Core utilities, types, validation schemas
│   │   ├── utils/        # Token generator, tenant utilities
│   │   └── validation/   # Zod schemas for MQTT payloads
│   ├── db/               # Database layer
│   │   ├── db/           # Drizzle schemas (SQLite & PostgreSQL)
│   │   ├── repositories/ # Repository Pattern implementations
│   │   └── database.ts   # DB connection management
│   ├── telemetry-service/ # Telemetry buffering service
│   │   └── TelemetryService.ts  # Buffer/flush implementation
│   ├── mqtt-broker/      # MQTT broker library
│   │   ├── mqtt-server.ts       # Aedes server wrapper
│   │   ├── authentication.ts    # Device token auth hooks
│   │   └── handlers.ts          # MQTT publish handlers
│   └── api/              # REST API library
│       ├── server.ts     # Fastify server setup
│       ├── routes/       # API route handlers
│       └── services/     # Business logic services
├── apps/                 # Executable applications
│   ├── api/              # Full API + Telemetry server
│   │   └── index.ts      # Main entry point (REST + services)
│   └── broker/           # Standalone MQTT broker
│       └── index.ts      # Main entry point (MQTT → DB only)
└── tsconfig.base.json    # Shared TypeScript configuration with path aliases
```

**Key Benefits:**
- Clear separation between reusable libraries (`packages/`) and executable apps (`apps/`)
- Packages can be independently versioned and published
- Shared TypeScript configuration with `@pocket/*` path aliases
- Two deployment modes: full platform (API) or lightweight broker
- Easier testing and development with isolated concerns
- Scalable for future microservices architecture

## 3. Package Dependencies

```
@pocket/core (no internal deps)
    ↓
@pocket/db (depends on core)
    ↓
@pocket/telemetry-service (depends on db, core)
    ↓
@pocket/mqtt-broker (depends on telemetry-service, db, core)
@pocket/api (depends on telemetry-service, db, core)
    ↓
apps/api (uses api, telemetry-service, db, core)
apps/broker (uses mqtt-broker, telemetry-service, db, core)
```

## 4. Data Flow
1. **Ingestion:** MQTT Topic -> Zod Validation -> Memory Buffer (via TelemetryService).
2. **Batching:** Flush buffer to DB every 2s or 100 messages via Repository Pattern.
3. **API:** Fastify exposes `/telemetry`, `/devices`, `/tenants`, `/users` and `/auth` for history, management, and control.

## 5. Key Decisions
- **Monorepo:** Organized as pnpm workspace with packages for reusability and apps for deployment.
- **Multi-DB:** Use a Repository Pattern to abstract database calls. Supports SQLite (default) and PostgreSQL (via `DB_ADAPTER=postgres`).
- **Validation:** Zod validates incoming MQTT payloads; malformed messages are rejected early.
- **Auth:** Device-token based (MQTT) & JWT (API).
- **Performance:** SQLite WAL mode enabled for concurrent I/O; PostgreSQL uses connection pooling.
- **Drizzle ORM:** Schema-first approach with type-safe queries and automatic migrations.
- **TypeScript:** Strict mode with composite project references for incremental builds.
- **Path Aliases:** `@pocket/*` aliases map to package source for clean imports across the monorepo.

## 6. Repository Pattern
- **Interface:** `MessageRepository`, `DeviceRepository`, `TenantRepository`, and `UserRepository` define core operations.
- **Implementations:** 
  - SQLite: `SQLiteMessageRepository`, `SQLiteDeviceRepository`, `SQLiteTenantRepository`, `SQLiteUserRepository` (better-sqlite3 driver)
  - PostgreSQL: `PostgresMessageRepository`, `PostgresDeviceRepository`, `PostgresTenantRepository`, `PostgresUserRepository` (postgres.js driver)
- **Factory:** `createMessageRepository()`, `createDeviceRepository()`, `createTenantRepository()`, and `createUserRepository()` select implementation based on `DB_ADAPTER` env variable.
- **Adapter Selection:** Set `DB_ADAPTER=postgres` or `DB_ADAPTER=sqlite` (default).
- **Location:** All repository code is in `packages/db/src/repositories/`

## 7. Build and Development
- **Build:** `pnpm build` - Builds all packages and apps using TypeScript composite projects
- **Dev:** `pnpm dev:all` - Runs both API and broker with hot reload using concurrently
- **Test:** `pnpm test` - Runs tests across all packages
- **Individual builds:** `pnpm --filter @pocket/db build` - Build specific package

## 8. Security Implementation

### MQTT Security (Device Token Authentication)
- **Authentication Hook:** Validates device tokens on MQTT connection (implemented in `src/broker/authentication.ts`)
  - Devices must provide `username` (deviceId) and `password` (token)
  - Tokens are auto-generated short unique identifiers (format: xxxx-yyyy-zzzz)
  - Tokens are stored in the `DeviceToken` table with optional expiration
  - Expired tokens are automatically rejected
  - Unauthorized connections are refused

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

## 9. Device Management
- **Auto-Generated Tokens:** Each device gets a unique token (xxxx-yyyy-zzzz format, 14 chars)
  - Uses cryptographically secure random bytes (48 bits of entropy)
  - Collision-resistant even with hundreds of thousands of devices
  - Tokens can be regenerated/reset manually via API
  - Token generation is in `src/core/utils/token-generator.ts`
- **Device Metadata:**
  - `name` (required): Human-readable device name for identification
  - `labels` (optional): Array of labels for filtering and queries
  - `notes` (optional): Free text field for comments or notes
- **DeviceService:** Business logic layer handling device CRUD operations and token management (`src/core/services/DeviceService.ts`)
- **Device API:** RESTful endpoints for device lifecycle management (`src/api/routes/device.routes.ts`)