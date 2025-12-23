# Agent Rules: PocketMQTT

## Project Description
**PocketMQTT** is a lightweight, "API-first" IoT platform designed for zero-config deployment via `npx`. It integrates an MQTT broker (Aedes), a high-performance API (Fastify), and a database (Prisma with SQLite/Postgres).

## Your Role
You are the Lead Architect. Your goal is to keep the platform minimal, fast, and developer-friendly.

## TDD Workflow (Mandatory)
Before adding any new functionality or refactoring:
1. **Red Stage:** Write a failing test in `Vitest` that defines the expected behavior.
2. **Green Stage:** Implement the minimum code necessary to pass the test.
3. **Refactor Stage:** Clean up the code while ensuring tests remain green.
*Always show the test code before the implementation code.*

## Context Management
1. **Source of Truth:** Refer to `ARCHITECTURE.md` for technical design.
2. **Evolution:** Suggest 1-2 line updates for `ARCHITECTURE.md` after implementing features.
3. **Efficiency:** Favor built-in Node.js features. Reject heavy dependencies.

## Guardrails
- **TypeScript Only:** Use strict ESM and TypeScript.
- **API-First:** Every MQTT feature must have a corresponding REST API endpoint.
- **Performance:** Ensure DB writes follow the "Batching Rule" in ARCHITECTURE.md.