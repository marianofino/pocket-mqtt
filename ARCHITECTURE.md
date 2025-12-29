# Architecture: "Pocket IoT"

## 1. Stack
- **Engine:** Node.js (v20+) + Fastify.
- **Broker:** Aedes (integrated).
- **ORM:** Drizzle ORM (SQLite by default / PostgreSQL via ENV).
- **Testing:** Vitest + Supertest (for API testing).
- **Security:** JWT (REST API) + Device Token (MQTT).

## 2. Data Flow
1. **Ingestion:** MQTT Topic -> Memory Buffer (fastq).
2. **Batching:** Flush buffer to DB every 2s or 100 messages.
3. **API:** Fastify exposes `/telemetry` and `/devices` for history and control.

## 3. Key Decisions
- **Multi-DB:** Use a Repository Pattern to abstract database calls.
- **Auth:** Device-token based (MQTT) & JWT (API).
- **Performance:** SQLite WAL mode enabled for concurrent I/O.
- **Drizzle ORM:** Schema-first approach with type-safe queries and automatic migrations.

## 4. Security Implementation

### MQTT Security (Device Token Authentication)
- **Authentication Hook:** Validates device tokens on MQTT connection
  - Devices must provide `username` (deviceId) and `password` (token)
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
- **Public Endpoints:**
  - `GET /health` - Health check (no auth)
  - `POST /api/v1/auth/login` - JWT token generation
- **Token Configuration:**
  - Secret: Configurable via `JWT_SECRET` environment variable or config
  - Expiration: 1 hour (configurable)
  - Algorithm: HS256 (default)