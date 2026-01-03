import type Aedes from 'aedes';
import type { AuthenticateError, Client, PublishPacket, Subscription } from 'aedes';
import { createDeviceRepository } from '@pocket-mqtt/db';
import { verifyDeviceToken, generateTokenLookup } from '@pocket-mqtt/core';
import { rewriteTopic } from './topic-rewriter.js';

/**
 * Setup MQTT authentication hooks for device token validation and multi-tenant topic isolation.
 * 
 * Authentication:
 * - Implements single-credential device-token authentication as per ARCHITECTURE.md
 * - Devices authenticate using only their token as the username (no password required)
 * - Token is verified using constant-time comparison to prevent timing attacks
 * 
 * Topic Isolation:
 * - All topics are rewritten to include tenant prefix: tenants/{tenantId}/{originalTopic}
 * - MQTT reserved topics ($SYS/, $share/, $queue/) are blocked completely
 * - Client-supplied tenant segments are treated as normal subtopics within the tenant's namespace
 * - This ensures complete tenant isolation regardless of wildcards or malicious attempts
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

  // Authorize publish hook - rewrites topics for multi-tenant isolation
  aedes.authorizePublish = async (client: Client | null, packet: PublishPacket, callback: (error?: Error | null) => void) => {
    // Ensure client is authenticated and has tenantId
    const tenantId = (client as any)?.tenantId;
    if (!tenantId) {
      callback(new Error('Unauthenticated client'));
      return;
    }

    try {
      // Rewrite topic to include tenant prefix and block reserved topics
      packet.topic = rewriteTopic(packet.topic, tenantId);
      callback(null);
    } catch (error) {
      // Reject reserved MQTT topics or other errors
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Authorize subscribe hook - rewrites topics for multi-tenant isolation
  aedes.authorizeSubscribe = async (client: Client | null, subscription: Subscription, callback: (error: Error | null, subscription?: Subscription | null) => void) => {
    // Ensure client is authenticated and has tenantId
    const tenantId = (client as any)?.tenantId;
    if (!tenantId) {
      callback(new Error('Unauthenticated client'));
      return;
    }

    try {
      // Rewrite topic to include tenant prefix and block reserved topics
      subscription.topic = rewriteTopic(subscription.topic, tenantId);
      callback(null, subscription);
    } catch (error) {
      // Reject reserved MQTT topics or other errors
      callback(error instanceof Error ? error : new Error(String(error)), null);
    }
  };
}
