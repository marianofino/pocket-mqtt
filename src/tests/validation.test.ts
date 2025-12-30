import { describe, it, expect } from 'vitest';
import { MqttPayloadSchema, MqttJsonPayloadSchema } from '../validation/mqtt-payload.schema.js';

describe('MQTT Payload Validation', () => {
  describe('MqttPayloadSchema', () => {
    it('should validate correct MQTT payload', () => {
      const result = MqttPayloadSchema.safeParse({
        topic: 'sensor/temperature',
        payload: '{"temperature": 25.5}',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topic).toBe('sensor/temperature');
        expect(result.data.payload).toBe('{"temperature": 25.5}');
      }
    });

    it('should reject empty topic', () => {
      const result = MqttPayloadSchema.safeParse({
        topic: '',
        payload: 'test payload',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty payload', () => {
      const result = MqttPayloadSchema.safeParse({
        topic: 'test/topic',
        payload: '',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing topic', () => {
      const result = MqttPayloadSchema.safeParse({
        payload: 'test payload',
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing payload', () => {
      const result = MqttPayloadSchema.safeParse({
        topic: 'test/topic',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('MqttJsonPayloadSchema', () => {
    it('should validate and parse valid JSON payload', () => {
      const result = MqttJsonPayloadSchema.safeParse({
        topic: 'sensor/temperature',
        payload: '{"temperature": 25.5}',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topic).toBe('sensor/temperature');
        expect(result.data.payload).toEqual({ temperature: 25.5 });
      }
    });

    it('should reject invalid JSON payload', () => {
      const result = MqttJsonPayloadSchema.safeParse({
        topic: 'sensor/temperature',
        payload: 'not a json string',
      });

      expect(result.success).toBe(false);
    });

    it('should reject malformed JSON', () => {
      const result = MqttJsonPayloadSchema.safeParse({
        topic: 'sensor/temperature',
        payload: '{"incomplete":',
      });

      expect(result.success).toBe(false);
    });
  });
});
