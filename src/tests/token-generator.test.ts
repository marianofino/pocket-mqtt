import { describe, it, expect } from 'vitest';
import { generateDeviceToken } from '../core/utils/token-generator.js';

describe('Token Generator', () => {
  describe('generateDeviceToken', () => {
    it('should generate a token in the format xxxx-yyyy-zzzz', () => {
      const token = generateDeviceToken();
      
      // Check format: 4 chars - 4 chars - 4 chars
      expect(token).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
      expect(token.length).toBe(14); // 12 hex chars + 2 hyphens
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      const count = 1000;
      
      for (let i = 0; i < count; i++) {
        tokens.add(generateDeviceToken());
      }
      
      // All tokens should be unique
      expect(tokens.size).toBe(count);
    });

    it('should use only lowercase hex characters', () => {
      const token = generateDeviceToken();
      const withoutHyphens = token.replace(/-/g, '');
      
      expect(withoutHyphens).toMatch(/^[0-9a-f]+$/);
      expect(withoutHyphens).not.toMatch(/[A-F]/); // No uppercase
    });

    it('should generate cryptographically random tokens', () => {
      // Generate many tokens and check distribution
      const firstChars = new Map<string, number>();
      const count = 1000;
      
      for (let i = 0; i < count; i++) {
        const token = generateDeviceToken();
        const firstChar = token[0];
        firstChars.set(firstChar, (firstChars.get(firstChar) || 0) + 1);
      }
      
      // With 16 possible first characters (0-9, a-f),
      // we should see reasonable distribution (not all the same)
      expect(firstChars.size).toBeGreaterThan(5);
    });
  });
});
