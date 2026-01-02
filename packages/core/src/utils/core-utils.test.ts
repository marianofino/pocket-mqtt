import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { generateDeviceToken } from './token-generator.js';
import {
  generateTenantToken,
  validateTenantNameFormat,
  validateTenantToken
} from './tenant-utils.js';

const TOKEN_REGEX = /^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/;

describe('core utils', () => {
  describe('generateDeviceToken', () => {
    it('produces token in xxxx-yyyy-zzzz format', () => {
      const token = generateDeviceToken();
      expect(token).toMatch(TOKEN_REGEX);
      expect(token.length).toBe(14);
    });

    it('generates unique tokens across calls', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 200; i++) {
        tokens.add(generateDeviceToken());
      }
      expect(tokens.size).toBe(200);
    });
  });

  describe('tenant utils', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('accepts valid tenant names and rejects invalid ones', () => {
      expect(validateTenantNameFormat('acme')).toBe(true);
      expect(validateTenantNameFormat('acme-iot-01')).toBe(true);
      expect(validateTenantNameFormat('Acme')).toBe(false);
      expect(validateTenantNameFormat('-acme')).toBe(false);
      expect(validateTenantNameFormat('acme-')).toBe(false);
      expect(validateTenantNameFormat('acme--iot')).toBe(false);
      expect(validateTenantNameFormat('')).toBe(false);
    });

    it('generates tenant tokens that are valid within one minute', () => {
      const token = generateTenantToken('acme');
      expect(validateTenantToken('acme', token)).toBe(true);

      // Expire the token after the 60s window
      vi.setSystemTime(new Date(now.getTime() + 61_000));
      expect(validateTenantToken('acme', token)).toBe(false);
    });

    it('rejects malformed tenant tokens', () => {
      expect(validateTenantToken('acme', 'not-a-token')).toBe(false);
      expect(validateTenantToken('acme', '123456:short')).toBe(false);
      expect(validateTenantToken('acme', 'invalid:number:number:number')).toBe(false);
    });
  });
});
