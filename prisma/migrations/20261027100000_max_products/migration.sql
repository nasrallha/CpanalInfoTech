-- حد عدد الأصناف (الباقة + حد خاص للشركة)

-- AlterTable
ALTER TABLE `plans` ADD COLUMN `maxProducts` INTEGER NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `maxProducts` INTEGER NULL;
