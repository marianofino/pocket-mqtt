# Architecture: "Pocket IoT"

## 1. Stack
- **Engine:** Node.js (v20+) + Fastify.
- **Broker:** Aedes (integrated).
- **ORM:** Prisma (SQLite by default / PostgreSQL via ENV).
- **Testing:** Vitest + Supertest (for API testing).

## 2. Data Flow
1. **Ingestion:** MQTT Topic -> Memory Buffer (fastq).
2. **Batching:** Flush buffer to DB every 2s or 100 messages.
3. **API:** Fastify exposes `/telemetry` and `/devices` for history and control.

## 3. Key Decisions
- **Multi-DB:** Use a Repository Pattern to abstract Prisma calls.
- **Auth:** Device-token based (MQTT) & JWT (API).
- **Performance:** SQLite WAL mode enabled for concurrent I/O.