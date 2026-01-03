import type Aedes from 'aedes';
import type { AuthenticateError, Client, PublishPacket } from 'aedes';
import { getDbClient, getDbAdapter, deviceToken as deviceTokenSchema, schemaPg } from '@pocket-mqtt/db';
import { verifyDeviceToken, generateTokenLookup } from '@pocket-mqtt/core';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schemaSqlite from '@pocket-mqtt/db';

const deviceTokenSchemaPg = schemaPg.deviceToken;

type SqliteDbClient = BetterSQLite3Database<typeof schemaSqlite>;
type PostgresDbClient = PostgresJsDatabase<typeof schemaPg>;

/**
 * Setup MQTT authentication hooks for device token validation.
 * Implements device-token based authentication as per ARCHITECTURE.md.
 * 
 * Supports two authentication modes:
 * 1. Legacy mode: username=deviceId, password=token (backward compatible)
 * 2. Single-credential mode: username=token, no password (new feature)
 * 
 * Security: Tokens are verified against hashed values stored in the database
 * using constant-time comparison to prevent timing attacks.
 * 
 * @param aedes - Aedes MQTT broker instance
 */
export function setupMQTTAuthentication(aedes: Aedes): void {
  const adapter = getDbAdapter();
  
  // Authenticate hook - validates device tokens on connection
  aedes.authenticate = async (client: Client, username: string | undefined, password: Buffer | undefined, callback: (error: AuthenticateError | null, success: boolean) => void) => {
    // Reject connections without username
    if (!username) {
      callback(null, false);
      return;
    }

    try {
      let deviceTokenRecord: { deviceId: string; tokenHash: string; expiresAt: Date | null; tenantId: number } | undefined;

      // Single-credential mode: username is token, no password
      if (!password) {
        const token = username;
        const tokenLookup = generateTokenLookup(token);

        // Look up device by tokenLookup
        if (adapter === 'postgres') {
          const db = getDbClient() as PostgresDbClient;
          const results = await db.select()
            .from(deviceTokenSchemaPg)
            .where(eq(deviceTokenSchemaPg.tokenLookup, tokenLookup))
            .limit(1);
          deviceTokenRecord = results[0];
        } else {
          const db = getDbClient() as SqliteDbClient;
          const results = await db.select()
            .from(deviceTokenSchema)
            .where(eq(deviceTokenSchema.tokenLookup, tokenLookup))
            .limit(1);
          deviceTokenRecord = results[0];
        }

        if (!deviceTokenRecord) {
          callback(null, false);
          return;
        }

        // Verify token hash using constant-time comparison
        const tokenValid = await verifyDeviceToken(token, deviceTokenRecord.tokenHash);
        if (!tokenValid) {
          callback(null, false);
          return;
        }
      } else {
        // Legacy mode: username=deviceId, password=token
        const deviceId = username;
        const token = password.toString();
        
        // Look up device by deviceId (username) in database based on adapter
        if (adapter === 'postgres') {
          const db = getDbClient() as PostgresDbClient;
          const results = await db.select()
            .from(deviceTokenSchemaPg)
            .where(eq(deviceTokenSchemaPg.deviceId, deviceId))
            .limit(1);
          deviceTokenRecord = results[0];
        } else {
          const db = getDbClient() as SqliteDbClient;
          const results = await db.select()
            .from(deviceTokenSchema)
            .where(eq(deviceTokenSchema.deviceId, deviceId))
            .limit(1);
          deviceTokenRecord = results[0];
        }

        if (!deviceTokenRecord) {
          callback(null, false);
          return;
        }

        // Verify token hash using constant-time comparison
        const tokenValid = await verifyDeviceToken(token, deviceTokenRecord.tokenHash);
        if (!tokenValid) {
          callback(null, false);
          return;
        }
      }

      // Check if token is expired
      if (deviceTokenRecord.expiresAt && deviceTokenRecord.expiresAt < new Date()) {
        callback(null, false);
        return;
      }

      // Attach tenantId to client for use in publish handler
      (client as any).tenantId = deviceTokenRecord.tenantId;

      // Authentication successful
      callback(null, true);
    } catch (error) {
      console.error('MQTT authentication error:', error);
      callback(null, false);
    }
  };

  // Authorize publish hook - validates device can publish to topic
  aedes.authorizePublish = async (_client: Client | null, _packet: PublishPacket, callback: (error?: Error | null) => void) => {
    // Allow publish if client is authenticated
    // Additional authorization logic could be added here (e.g., topic-based permissions)
    callback(null);
  };
}
