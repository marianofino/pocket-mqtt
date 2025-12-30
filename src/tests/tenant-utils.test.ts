import { describe, it, expect } from 'vitest';
import { 
  validateTenantToken, 
  hashTenantName, 
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

  describe('validateTenantToken', () => {
    it('should validate correct token', () => {
      const name = 'test-tenant';
      const token = hashTenantName(name);
      expect(validateTenantToken(name, token)).toBe(true);
    });

    it('should reject incorrect token', () => {
      const name = 'test-tenant';
      const wrongToken = 'wrong-token';
      expect(validateTenantToken(name, wrongToken)).toBe(false);
    });

    it('should reject token for different tenant name', () => {
      const name1 = 'tenant-a';
      const name2 = 'tenant-b';
      const token1 = hashTenantName(name1);
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
