# PocketMQTT Examples

Practical scripts for exercising the REST API, MQTT broker, and device lifecycle.

## Prereqs (do once)

```bash
pnpm install
pnpm db:push
pnpm dev:all   # keep running in another terminal
```

## Scripts

- **Setup demo data:** `npx tsx examples/setup-device.ts` (creates demo tenant + tokens: `sensor-001`, `subscriber-001`, `sensor-002`).
- **REST client:** `npx tsx examples/rest-api-client.ts` (login, post telemetry, fetch telemetry, unauthorized check, health check).
- **MQTT:**
  - Subscriber: `npx tsx examples/mqtt-subscriber.ts`
  - Publisher: `npx tsx examples/mqtt-publisher.ts`

## Device lifecycle (API + MQTT)

1) **Create device (JWT required)**

```bash
# get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

curl -X POST http://localhost:3000/api/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Temperature Sensor 1","labels":["sensor","temperature"]}'
```

2) **Use the device over MQTT**

```
username = deviceId
password = deviceToken
broker   = mqtt://localhost:1883
```

3) **Manage devices**

- List: `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/devices`
- Get one: `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/devices/:id`
- Regenerate token: `curl -X POST -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/devices/:id/regenerate-token`
- Update labels/notes: `PATCH /api/devices/:id`
- Delete: `DELETE /api/devices/:id`

## Security spot-checks

- MQTT without creds should fail to connect.
- REST without JWT should return 401.
- With valid JWT, `/api/v1/telemetry` should succeed.

## Troubleshooting

- "no such table": rerun `pnpm db:push`, then `npx tsx examples/setup-device.ts`.
- MQTT refused: ensure `pnpm dev:all` is running; verify device token; check username/password order.
- REST 401: refresh JWT, ensure `Authorization: Bearer <token>` header.

See `ARCHITECTURE.md` for security details and the root `README.md` for a repo overview.
