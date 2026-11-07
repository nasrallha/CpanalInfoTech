-- مزامنة الاشتراك مع قاعدة الشركة

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `syncError` TEXT NULL,
    ADD COLUMN `syncedAt` DATETIME(3) NULL;
