import { pgTable, serial, text, timestamp, index, integer, unique } from 'drizzle-orm/pg-core';

/**
 * Tenant table schema for PostgreSQL
 * Stores tenant information for multi-tenancy support
 */
export const tenant = pgTable('Tenant', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // Tenant name (lowercase-hyphen only)
  apiKey: text('apiKey').notNull().unique(), // API key for tenant authentication
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('Tenant_name_idx').on(table.name),
  apiKeyIdx: index('Tenant_apiKey_idx').on(table.apiKey),
}));

/**
 * User table schema for PostgreSQL
 * Stores per-tenant admin users
 */
export const user = pgTable('User', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenantId').notNull().references(() => tenant.id),
  username: text('username').notNull(),
  passwordHash: text('passwordHash').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('User_tenantId_idx').on(table.tenantId),
  // Unique constraint: username must be unique per tenant
  uniqueUsernamePerTenant: unique('User_tenantId_username_unique').on(table.tenantId, table.username),
}));

/**
 * Telemetry table schema for PostgreSQL
 * Stores MQTT telemetry messages with topic, payload, and timestamp
 */
export const telemetry = pgTable('Telemetry', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenantId').notNull().references(() => tenant.id),
  topic: text('topic').notNull(),
  payload: text('payload').notNull(),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  timestampIdx: index('Telemetry_timestamp_idx').on(table.timestamp),
  topicIdx: index('Telemetry_topic_idx').on(table.topic),
  tenantIdIdx: index('Telemetry_tenantId_idx').on(table.tenantId),
}));

/**
 * DeviceToken table schema for PostgreSQL
 * Stores device authentication tokens for MQTT connections
 * with additional metadata for device management
 */
export const deviceToken = pgTable('DeviceToken', {
  id: serial('id').primaryKey(),
  tenantId: integer('tenantId').notNull().references(() => tenant.id),
  deviceId: text('deviceId').notNull().unique(),
  token: text('token').notNull().unique(),
  name: text('name').notNull(), // Device name for identification
  labels: text('labels'), // JSON array of labels for filtering/queries (optional)
  notes: text('notes'), // Free text field for comments/notes (optional)
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  expiresAt: timestamp('expiresAt', { mode: 'date' }),
}, (table) => ({
  tokenIdx: index('DeviceToken_token_idx').on(table.token),
  deviceIdIdx: index('DeviceToken_deviceId_idx').on(table.deviceId),
  tenantIdIdx: index('DeviceToken_tenantId_idx').on(table.tenantId),
}));

export type Tenant = typeof tenant.$inferSelect;
export type NewTenant = typeof tenant.$inferInsert;
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Telemetry = typeof telemetry.$inferSelect;
export type NewTelemetry = typeof telemetry.$inferInsert;
export type DeviceToken = typeof deviceToken.$inferSelect;
export type NewDeviceToken = typeof deviceToken.$inferInsert;
