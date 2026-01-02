import { z } from 'zod';

/**
 * Zod schema for validating MQTT payload messages.
 * 
 * According to ARCHITECTURE.md requirements:
 * - Ensures incoming MQTT payloads are validated
 * - Malformed messages are rejected early
 * - Supports JSON payloads with flexible structure
 */
export const MqttPayloadSchema = z.object({
  topic: z.string().min(1, 'Topic must not be empty'),
  payload: z.string().min(1, 'Payload must not be empty'),
});

export type MqttPayload = z.infer<typeof MqttPayloadSchema>;

/**
 * Optional JSON payload validation schema.
 * Validates that the payload string contains valid JSON.
 */
export const MqttJsonPayloadSchema = MqttPayloadSchema.extend({
  payload: z.string().transform((val, ctx) => {
    try {
      return JSON.parse(val);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Payload must be valid JSON',
      });
      return z.NEVER;
    }
  }),
});

export type MqttJsonPayload = z.infer<typeof MqttJsonPayloadSchema>;
