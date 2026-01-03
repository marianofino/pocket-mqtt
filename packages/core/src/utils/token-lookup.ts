import { createHmac } from 'node:crypto';

/**
 * Secret key for HMAC token lookup generation.
 * 
 * SECURITY: This MUST be set via the TOKEN_LOOKUP_SECRET environment variable in production.
 * The secret should be:
 * - At least 32 bytes of cryptographically secure random data
 * - Stored securely (e.g., in a secrets manager or secure environment variables)
 * - Never committed to source control
 * 
 * For development and testing, a default value is provided, but this should NEVER be used in production.
 */
const HMAC_SECRET_KEY = process.env.TOKEN_LOOKUP_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TOKEN_LOOKUP_SECRET environment variable is required in production. ' +
      'Generate a secure secret with: openssl rand -hex 32'
    );
  }
  // Development/test fallback only
  return 'pocket-mqtt-token-lookup-secret-key-INSECURE-DEV-ONLY';
})();

/**
 * Generate a deterministic lookup key for a device token using HMAC-SHA256.
 * This allows efficient device lookup by token without storing plaintext tokens.
 * 
 * The lookup key is computed as: HMAC-SHA256(secret_key, token)
 * 
 * Security considerations:
 * - The HMAC secret should be kept confidential and stored securely
 * - The lookup key is deterministic, allowing efficient database lookups
 * - Even if the database is compromised, the HMAC secret prevents token reconstruction
 * - This is different from the tokenHash which uses scrypt with per-token salt for verification
 * 
 * @param token - The plaintext device token
 * @returns Hex-encoded HMAC-SHA256 hash of the token (64 characters)
 */
export function generateTokenLookup(token: string): string {
  const hmac = createHmac('sha256', HMAC_SECRET_KEY);
  hmac.update(token);
  return hmac.digest('hex');
}
