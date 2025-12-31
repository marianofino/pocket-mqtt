import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Pepper value for tenant token validation.
 * MUST be set via environment variable in production.
 * Falls back to a test-only value in development/testing environments.
 */
const TENANT_TOKEN_PEPPER = process.env.TENANT_TOKEN_PEPPER || (
  process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
    ? 'test-only-pepper-INSECURE-do-not-use-in-production'
    : undefined
);

if (!TENANT_TOKEN_PEPPER && process.env.NODE_ENV === 'production') {
  throw new Error('TENANT_TOKEN_PEPPER environment variable must be set in production');
}

if (!TENANT_TOKEN_PEPPER) {
  console.warn('WARNING: TENANT_TOKEN_PEPPER not set. Using insecure default for testing only!');
}

/**
 * Validate tenant token by hashing name + pepper.
 * Uses constant-time comparison to prevent timing attacks.
 * 
 * @param name Tenant name
 * @param token Token to validate
 * @returns True if token is valid, false otherwise
 */
export function validateTenantToken(name: string, token: string): boolean {
  const expectedHash = hashTenantName(name);
  
  // Use constant-time comparison to prevent timing attacks
  if (expectedHash.length !== token.length) {
    return false;
  }
  
  const expectedBuffer = Buffer.from(expectedHash, 'utf8');
  const tokenBuffer = Buffer.from(token, 'utf8');
  
  try {
    return timingSafeEqual(expectedBuffer, tokenBuffer);
  } catch {
    // timingSafeEqual throws if buffers have different lengths
    return false;
  }
}

/**
 * Generate hash of tenant name + pepper for token validation.
 * Uses SHA-256 for secure hashing.
 * 
 * @param name Tenant name
 * @returns Hash of name + pepper
 */
export function hashTenantName(name: string): string {
  return createHash('sha256')
    .update(name + (TENANT_TOKEN_PEPPER || ''))
    .digest('hex');
}

/**
 * Generate a secure API key for tenant authentication.
 * Format: 32 random bytes encoded as hex (64 characters).
 * 
 * @returns A unique API key string
 */
export function generateTenantApiKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate tenant name format.
 * Must be lowercase letters, numbers, and hyphens only.
 * 
 * @param name Tenant name to validate
 * @returns True if name is valid, false otherwise
 */
export function validateTenantNameFormat(name: string): boolean {
  // Must be lowercase, numbers, and hyphens only
  const validFormat = /^[a-z0-9-]+$/.test(name);
  
  // Must not start or end with hyphen
  const noStartEndHyphen = !name.startsWith('-') && !name.endsWith('-');
  
  // Must not have consecutive hyphens
  const noConsecutiveHyphens = !name.includes('--');
  
  // Must have at least one character
  const notEmpty = name.length > 0;
  
  return validFormat && noStartEndHyphen && noConsecutiveHyphens && notEmpty;
}
