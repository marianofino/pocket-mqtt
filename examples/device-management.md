# Device Management Example

This example demonstrates how to create and manage MQTT devices with auto-generated tokens.

## Prerequisites

Start the PocketMQTT server:
```bash
npm run dev
```

## Create a Device

Create a new device with auto-generated token:

```bash
# First, login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Response: {"token": "YOUR_JWT_TOKEN"}

# Create a device
curl -X POST http://localhost:3000/api/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "nombre": "Temperature Sensor 1",
    "labels": ["sensor", "temperature", "zone-a"],
    "comentario": "Located in warehouse zone A"
  }'
```

Response:
```json
{
  "success": true,
  "device": {
    "id": 1,
    "deviceId": "device-1735534567890-abc123",
    "token": "a1b2-c3d4-e5f6",
    "nombre": "Temperature Sensor 1",
    "labels": ["sensor", "temperature", "zone-a"],
    "comentario": "Located in warehouse zone A",
    "createdAt": "2024-12-30T03:00:00.000Z",
    "expiresAt": null
  }
}
```

## Use Device Token for MQTT

Use the generated token to connect your MQTT device:

```javascript
// Using mqtt.js
const mqtt = require('mqtt');

const client = mqtt.connect('mqtt://localhost:1883', {
  username: 'device-1735534567890-abc123',  // deviceId from response
  password: 'a1b2-c3d4-e5f6'                // token from response
});

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Publish telemetry
  client.publish('sensor/temperature', JSON.stringify({
    value: 25.5,
    unit: 'celsius'
  }));
});
```

## List All Devices

```bash
curl http://localhost:3000/api/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Get Device Details

```bash
curl http://localhost:3000/api/devices/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Regenerate Device Token

If a token is compromised, regenerate it:

```bash
curl -X POST http://localhost:3000/api/devices/1/regenerate-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This invalidates the old token and returns a new one.

## Update Device Metadata

```bash
curl -X PUT http://localhost:3000/api/devices/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "nombre": "Temperature Sensor 1 - Updated",
    "labels": ["sensor", "temperature", "zone-a", "critical"],
    "comentario": "Moved to critical monitoring"
  }'
```

## Delete Device

```bash
curl -X DELETE http://localhost:3000/api/devices/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Token Format

Tokens are automatically generated in the format `xxxx-yyyy-zzzz`:
- 12 hexadecimal characters (48 bits of entropy)
- Short enough for easy transmission in MQTT packets
- Collision-resistant for hundreds of thousands of devices
- Cryptographically secure random generation

## Security Notes

1. **Store tokens securely**: Treat device tokens like passwords
2. **Use HTTPS/TLS**: In production, always use encrypted connections
3. **Rotate tokens**: Regenerate tokens periodically or when compromised
4. **Monitor usage**: Track device connections and unusual activity
5. **Set expiration**: For temporary devices, set `expiresAt` in the database

## Example: Python MQTT Client

```python
import paho.mqtt.client as mqtt
import json

# Device credentials from API
device_id = "device-1735534567890-abc123"
device_token = "a1b2-c3d4-e5f6"

client = mqtt.Client()
client.username_pw_set(device_id, device_token)

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected successfully")
        # Publish telemetry data
        payload = json.dumps({"temperature": 25.5, "humidity": 60})
        client.publish("sensor/data", payload)
    else:
        print(f"Connection failed with code {rc}")

client.on_connect = on_connect
client.connect("localhost", 1883, 60)
client.loop_forever()
```
