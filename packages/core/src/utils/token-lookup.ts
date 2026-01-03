import { createHmac } from 'node:crypto';

/**
 * Secret key for HMAC token lookup generation.
 * In production, this should be loaded from environment variables or secure configuration.
 * For now, we use a constant key as per the initial implementation requirement.
 * 
 * TODO: Move to environment configuration in future PR
 */
const HMAC_SECRET_KEY = process.env.TOKEN_LOOKUP_SECRET || 'pocket-mqtt-token-lookup-secret-key';

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
