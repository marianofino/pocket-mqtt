# Architecture: "Pocket IoT"

## 1. Stack
- **Engine:** Node.js (v20+) + Fastify.
- **Broker:** Aedes (integrated).
- **ORM:** Drizzle ORM (SQLite by default / PostgreSQL via ENV).
- **Validation:** Zod for schema validation of MQTT payloads.
- **Testing:** Vitest + Supertest (for API testing).
- **Security:** JWT (REST API) + Device Token (MQTT).

## 2. Data Flow
1. **Ingestion:** MQTT Topic -> Zod Validation -> Memory Buffer (fastq).
2. **Batching:** Flush buffer to DB every 2s or 100 messages via Repository Pattern.
3. **API:** Fastify exposes `/telemetry`, `/devices` and `/auth` for history, device management, and control.

## 3. Key Decisions
- **Multi-DB:** Use a Repository Pattern to abstract database calls. Supports SQLite (default) and PostgreSQL (via `DB_ADAPTER=postgres`).
- **Validation:** Zod validates incoming MQTT payloads; malformed messages are rejected early.
- **Auth:** Device-token based (MQTT) & JWT (API).
- **Performance:** SQLite WAL mode enabled for concurrent I/O; PostgreSQL uses connection pooling.
- **Drizzle ORM:** Schema-first approach with type-safe queries and automatic migrations.

## 4. Repository Pattern
- **Interface:** `MessageRepository` and `DeviceRepository` define core operations.
- **Implementations:** 
  - `SQLiteMessageRepository` / `SQLiteDeviceRepository` for SQLite (better-sqlite3 driver)
  - `PostgresMessageRepository` / `PostgresDeviceRepository` for PostgreSQL (postgres.js driver)
- **Factory:** `createMessageRepository()` and `createDeviceRepository()` select implementation based on `DB_ADAPTER` env variable.
- **Adapter Selection:** Set `DB_ADAPTER=postgres` or `DB_ADAPTER=sqlite` (default).

## 5. Security Implementation

### MQTT Security (Device Token Authentication)
- **Authentication Hook:** Validates device tokens on MQTT connection
  - Devices must provide `username` (deviceId) and `password` (token)
  - Tokens are auto-generated short unique identifiers (format: xxxx-yyyy-zzzz)
  - Tokens are stored in the `DeviceToken` table with optional expiration
  - Expired tokens are automatically rejected
  - Unauthorized connections are refused

- **Authorization Hook:** Controls publish permissions
  - Currently allows all authenticated devices to publish
  - Extensible for topic-based permissions

### REST API Security (JWT Authentication)
- **JWT Plugin:** `@fastify/jwt` for token generation and verification
- **Protected Endpoints:**
  - `POST /api/v1/telemetry` - Requires valid JWT
  - `GET /api/v1/telemetry` - Requires valid JWT
  - `POST /api/devices` - Requires valid JWT
  - `GET /api/devices` - Requires valid JWT
  - `GET /api/devices/:id` - Requires valid JWT
  - `POST /api/devices/:id/regenerate-token` - Requires valid JWT
  - `PUT /api/devices/:id` - Requires valid JWT
  - `DELETE /api/devices/:id` - Requires valid JWT
- **Public Endpoints:**
  - `GET /health` - Health check (no auth)
  - `POST /api/v1/auth/login` - JWT token generation
- **Token Configuration:**
  - Secret: Configurable via `JWT_SECRET` environment variable or config
  - Expiration: 1 hour (configurable)
  - Algorithm: HS256 (default)

## 6. Device Management
- **Auto-Generated Tokens:** Each device gets a unique token (xxxx-yyyy-zzzz format, 14 chars)
  - Uses cryptographically secure random bytes (48 bits of entropy)
  - Collision-resistant even with hundreds of thousands of devices
  - Tokens can be regenerated/reset manually via API
- **Device Metadata:**
  - `nombre` (required): Human-readable device name for identification
  - `labels` (optional): Array of labels for filtering and queries
  - `comentario` (optional): Free text field for comments or notes
- **DeviceService:** Business logic layer handling device CRUD operations and token management
- **Device API:** RESTful endpoints for device lifecycle management