import { describe, expect, it } from 'vitest';
import { rewriteTopic } from './topic-rewriter.js';

/**
 * Tests for multi-tenant topic isolation with MQTT reserved topic blocking.
 * 
 * Requirements:
 * 1. Block all MQTT reserved topics ($SYS/, $share/, $queue/)
 * 2. Prepend tenants/{tenantId}/ to all allowed topics
 * 3. Client-supplied tenant segments are treated as normal subtopics
 */
describe('rewriteTopic', () => {
  describe('MQTT Reserved Topics Blocking', () => {
    it('should block topics starting with $SYS/', () => {
      expect(() => rewriteTopic('$SYS/broker/info', 1))
        .toThrow('Reserved MQTT topics are not allowed');
    });

    it('should block topics starting with $share/', () => {
      expect(() => rewriteTopic('$share/group/devices/#', 1))
        .toThrow('Reserved MQTT topics are not allowed');
    });

    it('should block topics starting with $queue/', () => {
      expect(() => rewriteTopic('$queue/devices/telemetry', 1))
        .toThrow('Reserved MQTT topics are not allowed');
    });

    it('should allow topics with $ in other positions', () => {
      const result = rewriteTopic('devices/price$update', 1);
      expect(result).toBe('tenants/1/devices/price$update');
    });
  });

  describe('Tenant Prefix Prepending', () => {
    it('should prepend tenant prefix to simple topic', () => {
      const result = rewriteTopic('devices/foo/telemetry', 123);
      expect(result).toBe('tenants/123/devices/foo/telemetry');
    });

    it('should prepend tenant prefix to topic with wildcards', () => {
      const result = rewriteTopic('devices/+/telemetry', 456);
      expect(result).toBe('tenants/456/devices/+/telemetry');
    });

    it('should prepend tenant prefix to multi-level wildcard topic', () => {
      const result = rewriteTopic('devices/#', 789);
      expect(result).toBe('tenants/789/devices/#');
    });

    it('should handle single-level topic', () => {
      const result = rewriteTopic('telemetry', 1);
      expect(result).toBe('tenants/1/telemetry');
    });

    it('should handle empty topic', () => {
      const result = rewriteTopic('', 1);
      expect(result).toBe('tenants/1/');
    });
  });

  describe('Double Prefix Scenarios', () => {
    it('should treat client-supplied tenant prefix as normal subtopic', () => {
      // Client sends tenants/B/devices/bar
      // For tenant A, this becomes: tenants/A/tenants/B/devices/bar
      const result = rewriteTopic('tenants/B/devices/bar/telemetry', 1);
      expect(result).toBe('tenants/1/tenants/B/devices/bar/telemetry');
    });

    it('should handle multiple tenant segments in client topic', () => {
      const result = rewriteTopic('tenants/A/tenants/B/devices', 999);
      expect(result).toBe('tenants/999/tenants/A/tenants/B/devices');
    });

    it('should ensure isolation even with malicious tenant prefix', () => {
      // Malicious client tries to publish to another tenant's namespace
      // For tenant 1, tenants/999/... becomes tenants/1/tenants/999/...
      const result = rewriteTopic('tenants/999/devices/steal', 1);
      expect(result).toBe('tenants/1/tenants/999/devices/steal');
    });
  });

  describe('Edge Cases', () => {
    it('should handle topics with leading slashes', () => {
      const result = rewriteTopic('/devices/foo', 1);
      expect(result).toBe('tenants/1//devices/foo');
    });

    it('should handle topics with trailing slashes', () => {
      const result = rewriteTopic('devices/foo/', 1);
      expect(result).toBe('tenants/1/devices/foo/');
    });

    it('should handle topics with multiple slashes', () => {
      const result = rewriteTopic('devices//foo///bar', 1);
      expect(result).toBe('tenants/1/devices//foo///bar');
    });

    it('should handle very long tenant IDs', () => {
      const result = rewriteTopic('devices/test', 999999999);
      expect(result).toBe('tenants/999999999/devices/test');
    });
  });
});
