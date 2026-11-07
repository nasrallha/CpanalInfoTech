-- وحدات النشاط + استثناءاتها لكل شركة

-- AlterTable
ALTER TABLE `activities` ADD COLUMN `modules` JSON NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `moduleOverrides` JSON NULL;
