import type Aedes from 'aedes';
import type { AuthenticateError, Client, PublishPacket } from 'aedes';
import { createDeviceRepository } from '@pocket-mqtt/db';
import { verifyDeviceToken, generateTokenLookup } from '@pocket-mqtt/core';

/**
 * Setup MQTT authentication hooks for device token validation.
 * Implements single-credential device-token authentication as per ARCHITECTURE.md.
 * 
 * Devices authenticate using only their token as the username (no password required).
 * The token is used to look up the device via HMAC-based tokenLookup, and then
 * verified against the stored tokenHash using constant-time comparison.
 * 
 * Security: Tokens are verified against hashed values stored in the database
 * using constant-time comparison to prevent timing attacks.
 * 
 * @param aedes - Aedes MQTT broker instance
 */
export function setupMQTTAuthentication(aedes: Aedes): void {
  const deviceRepository = createDeviceRepository();
  
  // Authenticate hook - validates device tokens on connection
  aedes.authenticate = async (client: Client, username: string | undefined, password: Buffer | undefined, callback: (error: AuthenticateError | null, success: boolean) => void) => {
    // Reject connections without username
    if (!username) {
      callback(null, false);
      return;
    }

    // Reject connections with password (single-credential mode only)
    // This checks for both undefined/null passwords AND empty passwords
    if (password !== undefined && password !== null) {
      callback(null, false);
      return;
    }

    try {
      const token = username;
      const tokenLookup = generateTokenLookup(token);

      // Look up device by tokenLookup using repository pattern
      const deviceTokenRecord = await deviceRepository.findByTokenLookup(tokenLookup);

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

      // Attach deviceId and tenantId to client for use in audit logs, ACLs, and topic resolution
      (client as any).deviceId = deviceTokenRecord.deviceId;
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
