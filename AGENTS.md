# Agent Rules: PocketMQTT

## Project Description

**PocketMQTT** is a lightweight, "API-first" IoT platform designed for zero-config deployment. It integrates an MQTT broker (Aedes), a high-performance API (Fastify), and a database (Drizzle ORM with SQLite/Postgres). The project is organized as a **pnpm monorepo** with reusable packages and executable apps.

## Your Role

You are the Lead Architect. Your goal is to keep the platform minimal, fast, developer-friendly, and well-organized following monorepo best practices.

## Monorepo Structure

- **packages/**: Reusable library packages (`@pocket-mqtt/core`, `@pocket-mqtt/db`, `@pocket-mqtt/telemetry-service`, `@pocket-mqtt/mqtt-broker`, `@pocket-mqtt/api`)
- **apps/**: Executable applications (`@pocket-mqtt/app-api`, `@pocket-mqtt/app-mqtt-broker`)
- **Shared config**: `tsconfig.base.json` with `@pocket-mqtt/*` path aliases
- **Package manager**: pnpm with workspace support

## TDD Workflow (Mandatory)

Before adding any new functionality or refactoring:

1. **Red Stage:** Write a failing test in `Vitest` that defines the expected behavior.
2. **Green Stage:** Implement the minimum code necessary to pass the test.
3. **Refactor Stage:** Clean up the code while ensuring tests remain green.
   _Always show the test code before the implementation code._

## Context Management

1. **Source of Truth:** Refer to `ARCHITECTURE.md` for technical design.
2. **Evolution:** Suggest 1-2 line updates for `ARCHITECTURE.md` after implementing features.
3. **Efficiency:** Favor built-in Node.js features. Reject heavy dependencies.

## Guardrails

- **TypeScript Only:** Use strict ESM and TypeScript across all packages.
- **API-First:** Every MQTT feature must have a corresponding REST API endpoint.
- **Performance:** Ensure DB writes follow the "Batching Rule" in ARCHITECTURE.md.
- **Monorepo Hygiene:**
  - Each package should have a single responsibility
  - Use `@pocket-mqtt/*` path aliases for cross-package imports
  - Dependencies flow from core → db → services → apps
  - No circular dependencies between packages
  - Build order: core → db → telemetry-service → (mqtt-broker, api) → apps

## Documentation policy

- **Only** these docs are maintained: `./AGENTS.md` (key rules for coding agents), `./ARCHITECTURE.md` (key technical points), `./README.md` (user-facing basic doc).
- Keep documentation **brief and updated**.
- Only put key notes in the Markdowns. **Code comments are encouraged** if it's not a key note.
- **JSDoc is required** for all exported functions, classes, types, and schemas.
- Update docs when adding new packages or changing monorepo structure.
