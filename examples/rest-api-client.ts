#!/usr/bin/env tsx
/**
 * REST API Client Example
 * 
 * This example demonstrates how to use the PocketMQTT REST API
 * with JWT authentication.
 * 
 * Prerequisites:
 * 1. Start the PocketMQTT server: npm run dev
 * 2. Run this script: npx tsx examples/rest-api-client.ts
 */

const API_BASE_URL = 'http://localhost:3000';
const USERNAME = 'admin';
const PASSWORD = 'admin123';
const TENANT_ID = Number.parseInt(process.env.TENANT_ID || '1', 10);

interface TelemetryRecord {
  id: number;
  topic: string;
  payload: string;
  timestamp: string;
}

interface LoginResponse {
  token: string;
}

interface TelemetryListResponse {
  data: TelemetryRecord[];
  pagination: { total: number; limit: number; offset: number };
}

interface HealthResponse {
  status: string;
}

console.log('=== REST API Client Example ===\n');

async function login(): Promise<string> {
  console.log('1. Authenticating...');
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as LoginResponse;
  console.log('✓ Login successful');
  console.log(`  Token: ${data.token.substring(0, 20)}...\n`);
  return data.token;
}

async function postTelemetry(token: string) {
  console.log('2. Posting telemetry data...');
  const response = await fetch(`${API_BASE_URL}/api/v1/telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      topic: 'api/test',
      payload: JSON.stringify({
        temperature: 22.5,
        humidity: 65,
        timestamp: new Date().toISOString()
      }),
      tenantId: TENANT_ID
    })
  });

  if (!response.ok) {
    throw new Error(`POST telemetry failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { success: boolean; message?: string };
  console.log('✓ Telemetry posted successfully');
  console.log(`  Response: ${JSON.stringify(data)}\n`);
}

async function getTelemetry(token: string) {
  console.log('3. Retrieving telemetry data...');
  
  // Wait a bit for the data to be flushed to the database
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  const response = await fetch(`${API_BASE_URL}/api/v1/telemetry?limit=5`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`GET telemetry failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as TelemetryListResponse;
  console.log('✓ Telemetry retrieved successfully');
  console.log(`  Total records: ${data.pagination.total}`);
  console.log(`  Records returned: ${data.data.length}\n`);
  
  if (data.data.length > 0) {
    console.log('  Sample records:');
    data.data.slice(0, 3).forEach((record: TelemetryRecord, index: number) => {
      console.log(`    ${index + 1}. Topic: ${record.topic}`);
      console.log(`       Payload: ${record.payload.substring(0, 50)}${record.payload.length > 50 ? '...' : ''}`);
      console.log(`       Time: ${record.timestamp}`);
    });
  }
  console.log('');
}

async function getTelemetryByTopic(token: string, topic: string) {
  console.log(`4. Retrieving telemetry for topic "${topic}"...`);
  const response = await fetch(`${API_BASE_URL}/api/v1/telemetry?topic=${encodeURIComponent(topic)}&limit=10`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`GET telemetry by topic failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as TelemetryListResponse;
  console.log('✓ Topic telemetry retrieved');
  console.log(`  Records found: ${data.pagination.total}\n`);
}

async function testUnauthorizedAccess() {
  console.log('5. Testing unauthorized access (should fail)...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/telemetry`);
    if (response.status === 401) {
      console.log('✓ Unauthorized access correctly rejected (401)\n');
    } else {
      console.log(`✗ Expected 401, got ${response.status}\n`);
    }
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

async function checkHealth() {
  console.log('6. Checking server health (public endpoint)...');
  const response = await fetch(`${API_BASE_URL}/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as HealthResponse;
  console.log('✓ Server is healthy');
  console.log(`  Status: ${data.status}\n`);
}

async function main() {
  try {
    // Test health endpoint (no auth required)
    await checkHealth();
    
    // Test unauthorized access
    await testUnauthorizedAccess();
    
    // Login and get JWT token
    const token = await login();
    
    // Post telemetry data
    await postTelemetry(token);
    
    // Retrieve telemetry data
    await getTelemetry(token);
    
    // Get telemetry by topic
    await getTelemetryByTopic(token, 'api/test');
    
    console.log('=== All operations completed successfully! ===\n');
  } catch (error) {
    console.error('\n✗ Error:', error instanceof Error ? error.message : error);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure the PocketMQTT server is running (npm run dev)');
    console.log('2. Check that the server is listening on port 3000');
    console.log('3. Verify credentials are correct (default: admin/admin123)\n');
    process.exit(1);
  }
}

main();
