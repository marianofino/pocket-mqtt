CREATE TABLE `DeviceToken` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`deviceId` text NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `DeviceToken_deviceId_unique` ON `DeviceToken` (`deviceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `DeviceToken_token_unique` ON `DeviceToken` (`token`);--> statement-breakpoint
CREATE INDEX `DeviceToken_token_idx` ON `DeviceToken` (`token`);--> statement-breakpoint
CREATE INDEX `DeviceToken_deviceId_idx` ON `DeviceToken` (`deviceId`);--> statement-breakpoint
CREATE TABLE `Telemetry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic` text NOT NULL,
	`payload` text NOT NULL,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Telemetry_timestamp_idx` ON `Telemetry` (`timestamp`);--> statement-breakpoint
CREATE INDEX `Telemetry_topic_idx` ON `Telemetry` (`topic`);