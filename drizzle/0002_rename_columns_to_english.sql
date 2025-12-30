-- Rename columns from Spanish to English
ALTER TABLE `DeviceToken` RENAME COLUMN `nombre` TO `name`;
ALTER TABLE `DeviceToken` RENAME COLUMN `comentario` TO `notes`;
