import { z } from 'zod';

/**
 * Zod schema for MQTT telemetry payload validation.
 * Ensures that incoming MQTT messages have valid topic and payload fields.
 */
export const mqttPayloadSchema = z.object({
  topic: z.string().min(1, 'Topic must not be empty'),
  payload: z.string().min(1, 'Payload must not be empty'),
});

export type MqttPayload = z.infer<typeof mqttPayloadSchema>;

/**
 * Validate MQTT payload data.
 * @param data - Raw data to validate
 * @returns Validated payload or null if validation fails
 */
export function validateMqttPayload(data: unknown): MqttPayload | null {
  const result = mqttPayloadSchema.safeParse(data);
  return result.success ? result.data : null;
}
