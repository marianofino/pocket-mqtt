import type Aedes from 'aedes';
import type { AuthenticateError, Client, PublishPacket } from 'aedes';
import { getDbClient, getDbAdapter, deviceToken as deviceTokenSchema, schemaPg } from '@pocket-mqtt/db';
import { verifyDeviceToken } from '@pocket-mqtt/core';
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
 * Security: Tokens are verified against hashed values stored in the database
 * using constant-time comparison to prevent timing attacks.
 * 
 * @param aedes - Aedes MQTT broker instance
 */
export function setupMQTTAuthentication(aedes: Aedes): void {
  const adapter = getDbAdapter();
  
  // Authenticate hook - validates device tokens on connection
  aedes.authenticate = async (client: Client, username: string | undefined, password: Buffer | undefined, callback: (error: AuthenticateError | null, success: boolean) => void) => {
    // Reject connections without credentials
    if (!username || !password) {
      callback(null, false);
      return;
    }

    try {
      const token = password.toString();
      
      // Look up device by deviceId (username) in database based on adapter
      let deviceTokenRecord: { deviceId: string; tokenHash: string; expiresAt: Date | null; tenantId: number } | undefined;
      if (adapter === 'postgres') {
        const db = getDbClient() as PostgresDbClient;
        const results = await db.select()
          .from(deviceTokenSchemaPg)
          .where(eq(deviceTokenSchemaPg.deviceId, username))
          .limit(1);
        deviceTokenRecord = results[0];
      } else {
        const db = getDbClient() as SqliteDbClient;
        const results = await db.select()
          .from(deviceTokenSchema)
          .where(eq(deviceTokenSchema.deviceId, username))
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
