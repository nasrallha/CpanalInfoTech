-- رقم المنشأة (سجل تجاري / الرقم الموحد / هوية) والعنوان الوطني

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `idType` VARCHAR(5) NULL,
    ADD COLUMN `idNumber` VARCHAR(30) NULL,
    ADD COLUMN `district` VARCHAR(100) NULL,
    ADD COLUMN `street` VARCHAR(100) NULL,
    ADD COLUMN `buildingNo` VARCHAR(4) NULL,
    ADD COLUMN `additionalNo` VARCHAR(4) NULL,
    ADD COLUMN `postalCode` VARCHAR(5) NULL;
