-- بيانات الشركة المالكة (الدعم الفني)

-- AlterTable
ALTER TABLE `panel_settings` ADD COLUMN `vendorArName` VARCHAR(150) NULL,
    ADD COLUMN `vendorEnName` VARCHAR(150) NULL,
    ADD COLUMN `vendorLogo` VARCHAR(500) NULL,
    ADD COLUMN `vendorPhone` VARCHAR(30) NULL,
    ADD COLUMN `vendorPhone2` VARCHAR(30) NULL,
    ADD COLUMN `vendorWhatsapp` VARCHAR(30) NULL,
    ADD COLUMN `vendorEmail` VARCHAR(150) NULL,
    ADD COLUMN `vendorWebsite` VARCHAR(200) NULL,
    ADD COLUMN `vendorAddressAr` VARCHAR(300) NULL,
    ADD COLUMN `vendorAddressEn` VARCHAR(300) NULL,
    ADD COLUMN `vendorHoursAr` VARCHAR(200) NULL,
    ADD COLUMN `vendorHoursEn` VARCHAR(200) NULL;
