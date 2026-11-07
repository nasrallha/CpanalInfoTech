-- استثناءات المميزات لكل شركة على باقتها

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `featureOverrides` JSON NULL;
