-- PostgreSQL Migration
-- Create Telemetry table
CREATE TABLE IF NOT EXISTS "Telemetry" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" text NOT NULL,
	"payload" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

-- Create DeviceToken table
CREATE TABLE IF NOT EXISTS "DeviceToken" (
	"id" serial PRIMARY KEY NOT NULL,
	"deviceId" text NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	CONSTRAINT "DeviceToken_deviceId_unique" UNIQUE("deviceId"),
	CONSTRAINT "DeviceToken_token_unique" UNIQUE("token")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Telemetry_timestamp_idx" ON "Telemetry" USING btree ("timestamp");
CREATE INDEX IF NOT EXISTS "Telemetry_topic_idx" ON "Telemetry" USING btree ("topic");
CREATE INDEX IF NOT EXISTS "DeviceToken_token_idx" ON "DeviceToken" USING btree ("token");
CREATE INDEX IF NOT EXISTS "DeviceToken_deviceId_idx" ON "DeviceToken" USING btree ("deviceId");
