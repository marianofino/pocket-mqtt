import { describe, expect, it } from 'vitest';
import { generateTokenLookup } from './token-lookup.js';

describe('generateTokenLookup', () => {
  it('generates a deterministic lookup key for a given token', () => {
    const token = 'abc1-def2-ghi3';
    const lookup1 = generateTokenLookup(token);
    const lookup2 = generateTokenLookup(token);
    
    expect(lookup1).toBe(lookup2);
    expect(typeof lookup1).toBe('string');
    expect(lookup1.length).toBeGreaterThan(0);
  });

  it('generates different lookup keys for different tokens', () => {
    const token1 = 'abc1-def2-ghi3';
    const token2 = 'xyz4-uvw5-rst6';
    
    const lookup1 = generateTokenLookup(token1);
    const lookup2 = generateTokenLookup(token2);
    
    expect(lookup1).not.toBe(lookup2);
  });

  it('generates consistent hex-encoded output', () => {
    const token = 'test-token-1234';
    const lookup = generateTokenLookup(token);
    
    // Should be hex-encoded (only 0-9a-f characters)
    expect(lookup).toMatch(/^[0-9a-f]+$/);
  });

  it('handles empty string token', () => {
    const lookup = generateTokenLookup('');
    expect(typeof lookup).toBe('string');
    expect(lookup.length).toBeGreaterThan(0);
  });
});
