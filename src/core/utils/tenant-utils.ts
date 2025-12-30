import { createHash, randomBytes } from 'crypto';

/**
 * Pepper value for tenant token validation.
 * In production, this should be loaded from a secure environment variable.
 */
const TENANT_TOKEN_PEPPER = process.env.TENANT_TOKEN_PEPPER || 'pocket-mqtt-default-pepper-change-in-production';

/**
 * Validate tenant token by hashing name + pepper.
 * 
 * @param name Tenant name
 * @param token Token to validate
 * @returns True if token is valid, false otherwise
 */
export function validateTenantToken(name: string, token: string): boolean {
  const expectedHash = hashTenantName(name);
  return expectedHash === token;
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
    .update(name + TENANT_TOKEN_PEPPER)
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
