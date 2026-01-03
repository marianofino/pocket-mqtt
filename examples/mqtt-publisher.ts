#!/usr/bin/env tsx
/**
 * MQTT Publisher Example
 *
 * Publishes a telemetry message using device-token authentication.
 * Run with: `npx tsx examples/mqtt-publisher.ts`
 */

import { connect } from 'mqtt';

type MqttConnect = typeof connect;

export interface PublishExampleOptions {
  deviceId?: string;
  deviceToken?: string;
  mqttHost?: string;
  mqttPort?: number;
  topic?: string;
  payload?: Record<string, unknown>;
  /**
   * Override the MQTT connect function (used for testing).
   */
  mqttConnect?: MqttConnect;
}

const DEFAULT_DEVICE_ID = 'sensor-001';
const DEFAULT_DEVICE_TOKEN = 'my-secure-device-token-123';
const DEFAULT_TOPIC = 'sensors/temperature';
const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 1883;

const buildPayload = (deviceId: string): Record<string, unknown> => ({
  deviceId,
  timestamp: new Date().toISOString(),
  temperature: 20 + Math.random() * 10, // 20-30°C
  humidity: 40 + Math.random() * 20, // 40-60%
});

/**
 * Publish a single telemetry message to the MQTT broker using device-token auth.
 */
export const publishExample = async (options: PublishExampleOptions = {}): Promise<void> => {
  const {
    deviceId = DEFAULT_DEVICE_ID,
    deviceToken = DEFAULT_DEVICE_TOKEN,
    mqttHost = DEFAULT_HOST,
    mqttPort = DEFAULT_PORT,
    topic = DEFAULT_TOPIC,
    payload,
    mqttConnect = connect,
  } = options;

  const url = `mqtt://${mqttHost}:${mqttPort}`;

  const client = mqttConnect(url, {
    clientId: deviceId,
    username: deviceId,
    password: deviceToken,
    clean: true,
    reconnectPeriod: 0,
  });

  await new Promise<void>((resolve, reject) => {
    const handleError = (err: Error) => {
      client.end(true, {}, () => reject(err));
    };

    client.on('error', handleError);

    client.on('connect', () => {
      const message = JSON.stringify(payload ?? buildPayload(deviceId));

      client.publish(topic, message, { qos: 0, retain: false }, (err) => {
        if (err) return handleError(err);

        client.end(false, {}, () => resolve());
      });
    });
  });
};

if (import.meta.main) {
  console.log('=== MQTT Publisher Example ===');
  console.log(`Broker: mqtt://${DEFAULT_HOST}:${DEFAULT_PORT}`);
  console.log(`Device ID: ${DEFAULT_DEVICE_ID}`);
  console.log(`Topic: ${DEFAULT_TOPIC}`);

  publishExample()
    .then(() => {
      console.log('✓ Message published successfully');
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error('✗ Failed to publish message:', message);
      process.exit(1);
    });
}
