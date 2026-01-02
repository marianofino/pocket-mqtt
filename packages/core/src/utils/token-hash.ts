import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/**
 * Hash a device token using scrypt.
 * Produces a deterministic hash for authentication purposes.
 * 
 * The hash format is: salt.hash (both hex-encoded)
 * This allows for secure comparison without storing plaintext tokens.
 * 
 * @param token - The plaintext device token to hash
 * @returns Promise resolving to the hashed token in format: salt.hash
 */
export async function hashDeviceToken(token: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(token, salt, 64)) as Buffer;
  return `${salt}.${hash.toString('hex')}`;
}

/**
 * Verify a device token against a stored hash.
 * Uses constant-time comparison to prevent timing attacks.
 * 
 * @param token - The plaintext token to verify
 * @param storedHash - The stored hash in format: salt.hash
 * @returns Promise resolving to true if token matches, false otherwise
 */
export async function verifyDeviceToken(token: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split('.');
    if (!salt || !hash) {
      return false;
    }

    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedHash = (await scryptAsync(token, salt, 64)) as Buffer;

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(hashBuffer, derivedHash);
  } catch (error) {
    // If any error occurs during verification, treat as invalid
    return false;
  }
}
