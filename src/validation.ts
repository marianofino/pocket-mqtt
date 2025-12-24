import { z } from 'zod';

/**
 * Maximum allowed length for MQTT topic strings.
 * This prevents excessively large topics from being processed.
 */
const MAX_TOPIC_LENGTH = 64 * 1024;

/**
 * Maximum allowed payload size in bytes (64KB).
 * This should align with TelemetryService's maxPayloadSize.
 */
const MAX_PAYLOAD_SIZE = 64 * 1024;

/**
 * Zod schema for MQTT telemetry payload validation.
 * Ensures that incoming MQTT messages have valid topic and payload fields.
 */
export const mqttPayloadSchema = z.object({
  topic: z
    .string()
    .min(1, 'Topic must not be empty')
    .max(MAX_TOPIC_LENGTH, 'Topic must not exceed 64KB'),
  payload: z
    .string()
    .min(1, 'Payload must not be empty')
    .max(MAX_PAYLOAD_SIZE, 'Payload must not exceed 64KB'),
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
