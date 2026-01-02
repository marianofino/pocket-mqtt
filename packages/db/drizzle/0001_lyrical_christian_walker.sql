ALTER TABLE `DeviceToken` ADD `nombre` text NOT NULL DEFAULT 'Unnamed Device';--> statement-breakpoint
ALTER TABLE `DeviceToken` ADD `labels` text;--> statement-breakpoint
ALTER TABLE `DeviceToken` ADD `comentario` text;