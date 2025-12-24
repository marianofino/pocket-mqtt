# PocketMQTT Examples

This directory contains example scripts to help you test and understand the security features of PocketMQTT.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. **Run database migrations** (IMPORTANT - do this first!):
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

3. Start the PocketMQTT server:
   ```bash
   npm run dev
   ```

## Quick Start

### 1. Setup Device Tokens

First, create device tokens in the database for MQTT authentication:

```bash
npx tsx examples/setup-device.ts
```

**Note:** If you get a "no such table" error, make sure you ran the database migrations first (see Prerequisites above).

This will create three test devices:
- `sensor-001` - For the MQTT publisher example
- `subscriber-001` - For the MQTT subscriber example  
- `sensor-002` - Additional sensor for testing

### 2. Test REST API (with JWT)

Run the REST API client to test JWT authentication:

```bash
npx tsx examples/rest-api-client.ts
```

This will:
- Login and get a JWT token
- Post telemetry data using the token
- Retrieve telemetry data
- Test unauthorized access (should fail)
- Check server health

### 3. Test MQTT Publisher (with Device Token)

In one terminal, start the subscriber:

```bash
npx tsx examples/mqtt-subscriber.ts
```

In another terminal, run the publisher:

```bash
npx tsx examples/mqtt-publisher.ts
```

The publisher will send temperature/humidity readings, and the subscriber will receive them in real-time.

## Example Scripts

### `setup-device.ts`
Creates device tokens in the database for MQTT authentication. Run this first before using MQTT examples.

**Usage:**
```bash
npx tsx examples/setup-device.ts
```

### `rest-api-client.ts`
Demonstrates REST API usage with JWT authentication.

**Features:**
- Login with credentials
- Post telemetry data
- Retrieve telemetry data
- Filter by topic
- Test unauthorized access

**Usage:**
```bash
npx tsx examples/rest-api-client.ts
```

### `mqtt-publisher.ts`
Publishes MQTT messages with device token authentication.

**Configuration:**
- Device ID: `sensor-001`
- Token: `my-secure-device-token-123`
- Topic: `sensors/temperature`

**Usage:**
```bash
npx tsx examples/mqtt-publisher.ts
```

### `mqtt-subscriber.ts`
Subscribes to MQTT topics with device token authentication.

**Configuration:**
- Device ID: `subscriber-001`
- Token: `subscriber-token-456`
- Topics: `sensors/#`, `devices/+/status`

**Usage:**
```bash
npx tsx examples/mqtt-subscriber.ts
```

## Security Testing

### Test Authentication Failures

#### MQTT without credentials:
```bash
# This should fail to connect
mqtt pub -h localhost -p 1883 -t test/topic -m "hello"
```

#### REST API without JWT:
```bash
# This should return 401 Unauthorized
curl http://localhost:3000/api/v1/telemetry
```

### Test with Valid Credentials

#### MQTT with device token:
```bash
mqtt pub -h localhost -p 1883 \
  -u sensor-001 \
  -P my-secure-device-token-123 \
  -t sensors/test \
  -m '{"value": 42}'
```

#### REST API with JWT:
```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

# Use token
curl http://localhost:3000/api/v1/telemetry \
  -H "Authorization: Bearer $TOKEN"
```

## Customization

### Create Your Own Device

Edit `setup-device.ts` to add your own devices:

```typescript
const devices = [
  {
    deviceId: 'my-device',
    token: 'my-secure-token',
    description: 'My custom device'
  }
];
```

Then update the publisher/subscriber scripts with your device credentials.

### Change API Credentials

Set environment variables:

```bash
export ADMIN_USERNAME=myuser
export ADMIN_PASSWORD=mypassword
export JWT_SECRET=my-secret-key

npm run dev
```

## Troubleshooting

### "no such table: DeviceToken" Error
This means the database migrations haven't been run yet. Fix it with:
```bash
npx prisma migrate deploy
npx prisma generate
```
Then run the setup script again.

### MQTT Connection Refused
- Check that the server is running (`npm run dev`)
- Verify the device token exists in the database
- Ensure credentials match: `username = deviceId`, `password = token`

### REST API 401 Unauthorized
- Verify you're using a valid JWT token
- Check token hasn't expired (default: 1 hour)
- Ensure you're using the `Authorization: Bearer <token>` header

### Database Errors
- Run migrations: `npx prisma migrate deploy`
- Generate Prisma client: `npx prisma generate`
- Check database file permissions

## Next Steps

- Explore the test files in `src/tests/security.test.ts` for more examples
- Read the [ARCHITECTURE.md](../ARCHITECTURE.md) for security implementation details
- Check the main [README.md](../README.md) for API documentation
