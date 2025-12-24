import { describe, it, expect } from 'vitest';
import { validateMqttPayload, mqttPayloadSchema } from '../validation.js';

describe('MQTT Payload Validation', () => {
  describe('validateMqttPayload', () => {
    it('should validate a valid MQTT payload', () => {
      const validPayload = {
        topic: 'sensor/temperature',
        payload: '{"temperature": 25.5}'
      };

      const result = validateMqttPayload(validPayload);
      expect(result).not.toBeNull();
      expect(result?.topic).toBe('sensor/temperature');
      expect(result?.payload).toBe('{"temperature": 25.5}');
    });

    it('should reject payload with empty topic', () => {
      const invalidPayload = {
        topic: '',
        payload: '{"temperature": 25.5}'
      };

      const result = validateMqttPayload(invalidPayload);
      expect(result).toBeNull();
    });

    it('should reject payload with empty payload field', () => {
      const invalidPayload = {
        topic: 'sensor/temperature',
        payload: ''
      };

      const result = validateMqttPayload(invalidPayload);
      expect(result).toBeNull();
    });

    it('should reject payload with missing topic', () => {
      const invalidPayload = {
        payload: '{"temperature": 25.5}'
      };

      const result = validateMqttPayload(invalidPayload);
      expect(result).toBeNull();
    });

    it('should reject payload with missing payload field', () => {
      const invalidPayload = {
        topic: 'sensor/temperature'
      };

      const result = validateMqttPayload(invalidPayload);
      expect(result).toBeNull();
    });

    it('should reject non-string topic', () => {
      const invalidPayload = {
        topic: 123,
        payload: '{"temperature": 25.5}'
      };

      const result = validateMqttPayload(invalidPayload);
      expect(result).toBeNull();
    });

    it('should reject non-string payload', () => {
      const invalidPayload = {
        topic: 'sensor/temperature',
        payload: { temperature: 25.5 }
      };

      const result = validateMqttPayload(invalidPayload);
      expect(result).toBeNull();
    });

    it('should reject null payload', () => {
      const result = validateMqttPayload(null);
      expect(result).toBeNull();
    });

    it('should reject undefined payload', () => {
      const result = validateMqttPayload(undefined);
      expect(result).toBeNull();
    });
  });

  describe('mqttPayloadSchema', () => {
    it('should parse valid data successfully', () => {
      const validData = {
        topic: 'test/topic',
        payload: 'test payload'
      };

      const result = mqttPayloadSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topic).toBe('test/topic');
        expect(result.data.payload).toBe('test payload');
      }
    });

    it('should fail for invalid data', () => {
      const invalidData = {
        topic: '',
        payload: 'test payload'
      };

      const result = mqttPayloadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
