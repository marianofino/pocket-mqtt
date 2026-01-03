CREATE TABLE `Tenant` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`apiKey` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Tenant_name_unique` ON `Tenant` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `Tenant_apiKey_unique` ON `Tenant` (`apiKey`);--> statement-breakpoint
CREATE INDEX `Tenant_name_idx` ON `Tenant` (`name`);--> statement-breakpoint
CREATE INDEX `Tenant_apiKey_idx` ON `Tenant` (`apiKey`);--> statement-breakpoint
CREATE TABLE `User` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenantId` integer NOT NULL,
	`username` text NOT NULL,
	`passwordHash` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `User_tenantId_idx` ON `User` (`tenantId`);--> statement-breakpoint
CREATE UNIQUE INDEX `User_tenantId_username_unique` ON `User` (`tenantId`,`username`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_DeviceToken` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenantId` integer NOT NULL,
	`deviceId` text NOT NULL,
	`tokenHash` text NOT NULL,
	`tokenLookup` text NOT NULL,
	`name` text NOT NULL,
	`labels` text,
	`notes` text,
	`createdAt` integer NOT NULL,
	`expiresAt` integer,
	FOREIGN KEY (`tenantId`) REFERENCES `Tenant`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_DeviceToken`("id", "tenantId", "deviceId", "tokenHash", "tokenLookup", "name", "labels", "notes", "createdAt", "expiresAt") SELECT "id", "tenantId", "deviceId", "tokenHash", 'migration-placeholder-' || "id", "name", "labels", "notes", "createdAt", "expiresAt" FROM `DeviceToken`;--> statement-breakpoint
DROP TABLE `DeviceToken`;--> statement-breakpoint
ALTER TABLE `__new_DeviceToken` RENAME TO `DeviceToken`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `DeviceToken_deviceId_unique` ON `DeviceToken` (`deviceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `DeviceToken_tokenLookup_unique` ON `DeviceToken` (`tokenLookup`);--> statement-breakpoint
CREATE INDEX `DeviceToken_deviceId_idx` ON `DeviceToken` (`deviceId`);--> statement-breakpoint
CREATE INDEX `DeviceToken_tenantId_idx` ON `DeviceToken` (`tenantId`);--> statement-breakpoint
CREATE INDEX `DeviceToken_tokenLookup_idx` ON `DeviceToken` (`tokenLookup`);--> statement-breakpoint
ALTER TABLE `Telemetry` ADD `tenantId` integer NOT NULL REFERENCES Tenant(id);--> statement-breakpoint
CREATE INDEX `Telemetry_tenantId_idx` ON `Telemetry` (`tenantId`);