import { randomBytes } from 'crypto';

/**
 * Generate a short, unique token for MQTT device authentication.
 * Format: xxxx-yyyy-zzzz (12 characters + 2 hyphens = 14 chars total)
 * 
 * Uses cryptographically secure random bytes to ensure uniqueness.
 * With 12 hex characters (48 bits), we have 2^48 = ~281 trillion possible tokens,
 * providing excellent collision resistance even with hundreds of thousands of devices.
 * 
 * @returns A unique token string in format xxxx-yyyy-zzzz
 */
export function generateDeviceToken(): string {
  // Generate 6 random bytes (48 bits)
  const buffer = randomBytes(6);
  
  // Convert to hex string (12 characters)
  const hex = buffer.toString('hex');
  
  // Format as xxxx-yyyy-zzzz for readability
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}
