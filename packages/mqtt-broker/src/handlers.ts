import type Aedes from 'aedes';
import type { TelemetryService } from '@pocket/telemetry-service';
import { MqttPayloadSchema } from '@pocket/core';

/**
 * Setup MQTT publish handlers for telemetry ingestion.
 * Validates incoming MQTT payloads and buffers them for batch writing.
 * 
 * @param aedes - Aedes MQTT broker instance
 * @param telemetryService - Service for buffering and persisting telemetry data
 * @param maxPayloadSize - Maximum allowed payload size in bytes (default: 64KB)
 */
export function setupMQTTHandlers(
  aedes: Aedes,
  telemetryService: TelemetryService,
  maxPayloadSize = 64 * 1024
): void {
  // Listen to published messages and buffer them for telemetry
  aedes.on('publish', (packet, client) => {
    // Skip system topics (starting with $)
    if (packet.topic.startsWith('$')) {
      return;
    }
    
    // Validate payload size to prevent memory issues
    const payloadSize = packet.payload.length;
    if (payloadSize > maxPayloadSize) {
      console.warn(`Rejected MQTT message on topic ${packet.topic}: payload size ${payloadSize} exceeds max ${maxPayloadSize}`);
      return;
    }
    
    const payloadString = packet.payload.toString();
    
    // Validate message with Zod schema
    const validation = MqttPayloadSchema.safeParse({
      topic: packet.topic,
      payload: payloadString,
    });
    
    if (!validation.success) {
      console.warn(`Rejected MQTT message on topic ${packet.topic}: validation failed`, validation.error.issues);
      return;
    }
    
    // Get tenantId from authenticated client
    const tenantId = (client as any)?.tenantId;
    if (!tenantId) {
      console.error(`Rejected MQTT message on topic ${packet.topic}: no tenant context available`);
      return;
    }
    
    // Buffer the message for batch writing (fire and forget for performance)
    telemetryService.addMessage(
      packet.topic,
      payloadString,
      tenantId
    ).catch(err => {
      // Log errors but don't block MQTT message flow
      console.error('Error buffering telemetry message:', err);
    });
  });
}
