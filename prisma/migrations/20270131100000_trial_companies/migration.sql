-- الشركات التجريبية: نفس جدول الشركات بعلامة isTrial (تاب لوحدها في اللوحة)
-- ترقيمها لوحده (من 900001 ← T1) ومش بياخد من سيريالات الشركات الحقيقية
ALTER TABLE `companies` ADD COLUMN `isTrial` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `companies_isTrial_idx` ON `companies`(`isTrial`);
