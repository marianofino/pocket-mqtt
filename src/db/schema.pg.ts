import { pgTable, serial, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Telemetry table schema for PostgreSQL
 * Stores MQTT telemetry messages with topic, payload, and timestamp
 */
export const telemetry = pgTable('Telemetry', {
  id: serial('id').primaryKey(),
  topic: text('topic').notNull(),
  payload: text('payload').notNull(),
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  timestampIdx: index('Telemetry_timestamp_idx').on(table.timestamp),
  topicIdx: index('Telemetry_topic_idx').on(table.topic),
}));

/**
 * DeviceToken table schema for PostgreSQL
 * Stores device authentication tokens for MQTT connections
 * with additional metadata for device management
 */
export const deviceToken = pgTable('DeviceToken', {
  id: serial('id').primaryKey(),
  deviceId: text('deviceId').notNull().unique(),
  token: text('token').notNull().unique(),
  nombre: text('nombre').notNull(), // Device name for identification
  labels: text('labels'), // JSON array of labels for filtering/queries (optional)
  comentario: text('comentario'), // Free text field for comments/notes (optional)
  createdAt: timestamp('createdAt', { mode: 'date' }).notNull().defaultNow(),
  expiresAt: timestamp('expiresAt', { mode: 'date' }),
}, (table) => ({
  tokenIdx: index('DeviceToken_token_idx').on(table.token),
  deviceIdIdx: index('DeviceToken_deviceId_idx').on(table.deviceId),
}));

export type Telemetry = typeof telemetry.$inferSelect;
export type NewTelemetry = typeof telemetry.$inferInsert;
export type DeviceToken = typeof deviceToken.$inferSelect;
export type NewDeviceToken = typeof deviceToken.$inferInsert;
