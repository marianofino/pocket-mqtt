import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

/**
 * Telemetry table schema
 * Stores MQTT telemetry messages with topic, payload, and timestamp
 */
export const telemetry = sqliteTable('Telemetry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  topic: text('topic').notNull(),
  payload: text('payload').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  timestampIdx: index('Telemetry_timestamp_idx').on(table.timestamp),
  topicIdx: index('Telemetry_topic_idx').on(table.topic),
}));

/**
 * DeviceToken table schema
 * Stores device authentication tokens for MQTT connections
 * with additional metadata for device management
 */
export const deviceToken = sqliteTable('DeviceToken', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('deviceId').notNull().unique(),
  token: text('token').notNull().unique(),
  nombre: text('nombre').notNull(), // Device name for identification
  labels: text('labels'), // JSON array of labels for filtering/queries (optional)
  comentario: text('comentario'), // Free text field for comments/notes (optional)
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }),
}, (table) => ({
  tokenIdx: index('DeviceToken_token_idx').on(table.token),
  deviceIdIdx: index('DeviceToken_deviceId_idx').on(table.deviceId),
}));

export type Telemetry = typeof telemetry.$inferSelect;
export type NewTelemetry = typeof telemetry.$inferInsert;
export type DeviceToken = typeof deviceToken.$inferSelect;
export type NewDeviceToken = typeof deviceToken.$inferInsert;
