-- النسخ التلقائي لقاعدة اللوحة نفسها
ALTER TABLE `panel_settings` ADD COLUMN `panelBackupEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `panelBackupTime` VARCHAR(5) NOT NULL DEFAULT '03:00',
    ADD COLUMN `panelBackupKeep` INTEGER NOT NULL DEFAULT 14,
    ADD COLUMN `panelBackupLastAt` DATETIME(3) NULL,
    ADD COLUMN `panelBackupLastOk` BOOLEAN NULL,
    ADD COLUMN `panelBackupLastError` VARCHAR(500) NULL;
