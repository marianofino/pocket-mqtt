CREATE TABLE "DeviceToken" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"deviceId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"tokenLookup" text NOT NULL,
	"name" text NOT NULL,
	"labels" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp,
	CONSTRAINT "DeviceToken_deviceId_unique" UNIQUE("deviceId"),
	CONSTRAINT "DeviceToken_tokenLookup_unique" UNIQUE("tokenLookup")
);
--> statement-breakpoint
CREATE TABLE "Telemetry" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"topic" text NOT NULL,
	"payload" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Tenant" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"apiKey" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Tenant_name_unique" UNIQUE("name"),
	CONSTRAINT "Tenant_apiKey_unique" UNIQUE("apiKey")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenantId" integer NOT NULL,
	"username" text NOT NULL,
	"passwordHash" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "User_tenantId_username_unique" UNIQUE("tenantId","username")
);
--> statement-breakpoint
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_tenantId_Tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Telemetry" ADD CONSTRAINT "Telemetry_tenantId_Tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_Tenant_id_fk" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "DeviceToken_deviceId_idx" ON "DeviceToken" USING btree ("deviceId");--> statement-breakpoint
CREATE INDEX "DeviceToken_tenantId_idx" ON "DeviceToken" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "DeviceToken_tokenLookup_idx" ON "DeviceToken" USING btree ("tokenLookup");--> statement-breakpoint
CREATE INDEX "Telemetry_timestamp_idx" ON "Telemetry" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "Telemetry_topic_idx" ON "Telemetry" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "Telemetry_tenantId_idx" ON "Telemetry" USING btree ("tenantId");--> statement-breakpoint
CREATE INDEX "Tenant_name_idx" ON "Tenant" USING btree ("name");--> statement-breakpoint
CREATE INDEX "Tenant_apiKey_idx" ON "Tenant" USING btree ("apiKey");--> statement-breakpoint
CREATE INDEX "User_tenantId_idx" ON "User" USING btree ("tenantId");