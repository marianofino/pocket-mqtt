import { describe, it, expect } from 'vitest';
import { 
  validateTenantToken, 
  hashTenantName,
  hashTenantNameWithTimestamp,
  generateTenantToken,
  generateTenantApiKey,
  validateTenantNameFormat 
} from '../core/utils/tenant-utils.js';

describe('Tenant Utils', () => {
  describe('hashTenantName', () => {
    it('should generate consistent hash for the same name', () => {
      const name = 'test-tenant';
      const hash1 = hashTenantName(name);
      const hash2 = hashTenantName(name);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different names', () => {
      const hash1 = hashTenantName('tenant-a');
      const hash2 = hashTenantName('tenant-b');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate a hex string', () => {
      const hash = hashTenantName('test');
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('hashTenantNameWithTimestamp', () => {
    it('should generate consistent hash for same name and timestamp', () => {
      const name = 'test-tenant';
      const timestamp = Date.now();
      const hash1 = hashTenantNameWithTimestamp(name, timestamp);
      const hash2 = hashTenantNameWithTimestamp(name, timestamp);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different timestamps', () => {
      const name = 'test-tenant';
      const hash1 = hashTenantNameWithTimestamp(name, 1000);
      const hash2 = hashTenantNameWithTimestamp(name, 2000);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateTenantToken', () => {
    it('should generate token in correct format (timestamp:hash)', () => {
      const name = 'test-tenant';
      const token = generateTenantToken(name);
      const parts = token.split(':');
      expect(parts.length).toBe(2);
      expect(parts[0]).toMatch(/^\d+$/); // timestamp
      expect(parts[1]).toMatch(/^[0-9a-f]+$/); // hash
    });

    it('should generate tokens with recent timestamps', () => {
      const name = 'test-tenant';
      const token = generateTenantToken(name);
      const [timestampStr] = token.split(':');
      const timestamp = Number.parseInt(timestampStr, 10);
      const now = Date.now();
      expect(timestamp).toBeGreaterThan(now - 1000); // Within last second
      expect(timestamp).toBeLessThanOrEqual(now);
    });
  });

  describe('validateTenantToken', () => {
    it('should validate correct token within 1 minute', () => {
      const name = 'test-tenant';
      const token = generateTenantToken(name);
      expect(validateTenantToken(name, token)).toBe(true);
    });

    it('should reject token with wrong format', () => {
      const name = 'test-tenant';
      expect(validateTenantToken(name, 'invalid-format')).toBe(false);
      expect(validateTenantToken(name, 'only-one-part')).toBe(false);
      expect(validateTenantToken(name, 'too:many:parts')).toBe(false);
    });

    it('should reject token with invalid timestamp', () => {
      const name = 'test-tenant';
      const hash = hashTenantNameWithTimestamp(name, 1000);
      expect(validateTenantToken(name, `invalid:${hash}`)).toBe(false);
      expect(validateTenantToken(name, `-1:${hash}`)).toBe(false);
    });

    it('should reject expired token (older than 1 minute)', () => {
      const name = 'test-tenant';
      const oldTimestamp = Date.now() - 61000; // 61 seconds ago
      const hash = hashTenantNameWithTimestamp(name, oldTimestamp);
      const expiredToken = `${oldTimestamp}:${hash}`;
      expect(validateTenantToken(name, expiredToken)).toBe(false);
    });

    it('should reject token from the future', () => {
      const name = 'test-tenant';
      const futureTimestamp = Date.now() + 10000; // 10 seconds in future
      const hash = hashTenantNameWithTimestamp(name, futureTimestamp);
      const futureToken = `${futureTimestamp}:${hash}`;
      expect(validateTenantToken(name, futureToken)).toBe(false);
    });

    it('should reject token with incorrect hash', () => {
      const name = 'test-tenant';
      const timestamp = Date.now();
      const wrongHash = 'wrong-hash-value';
      expect(validateTenantToken(name, `${timestamp}:${wrongHash}`)).toBe(false);
    });

    it('should reject token for different tenant name', () => {
      const name1 = 'tenant-a';
      const name2 = 'tenant-b';
      const token1 = generateTenantToken(name1);
      expect(validateTenantToken(name2, token1)).toBe(false);
    });
  });

  describe('generateTenantApiKey', () => {
    it('should generate a unique API key', () => {
      const key1 = generateTenantApiKey();
      const key2 = generateTenantApiKey();
      expect(key1).not.toBe(key2);
    });

    it('should generate a hex string of expected length', () => {
      const key = generateTenantApiKey();
      expect(key).toMatch(/^[0-9a-f]+$/);
      expect(key.length).toBe(64); // 32 bytes * 2 (hex encoding)
    });
  });

  describe('validateTenantNameFormat', () => {
    it('should accept valid lowercase-hyphen names', () => {
      expect(validateTenantNameFormat('test-tenant')).toBe(true);
      expect(validateTenantNameFormat('acme-cloud')).toBe(true);
      expect(validateTenantNameFormat('tenant123')).toBe(true);
      expect(validateTenantNameFormat('a')).toBe(true);
      expect(validateTenantNameFormat('test-tenant-123')).toBe(true);
    });

    it('should reject names with uppercase letters', () => {
      expect(validateTenantNameFormat('Test-Tenant')).toBe(false);
      expect(validateTenantNameFormat('ACME')).toBe(false);
    });

    it('should reject names with special characters', () => {
      expect(validateTenantNameFormat('test_tenant')).toBe(false);
      expect(validateTenantNameFormat('test.tenant')).toBe(false);
      expect(validateTenantNameFormat('test@tenant')).toBe(false);
      expect(validateTenantNameFormat('test tenant')).toBe(false);
    });

    it('should reject names starting with hyphen', () => {
      expect(validateTenantNameFormat('-test')).toBe(false);
    });

    it('should reject names ending with hyphen', () => {
      expect(validateTenantNameFormat('test-')).toBe(false);
    });

    it('should reject names with consecutive hyphens', () => {
      expect(validateTenantNameFormat('test--tenant')).toBe(false);
    });

    it('should reject empty names', () => {
      expect(validateTenantNameFormat('')).toBe(false);
    });
  });
});
