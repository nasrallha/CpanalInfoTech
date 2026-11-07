-- ------------------------------------------------------------
-- تطبيقات التوصيل (هنقرستيشن، جاهز، مرسول...) ← sales_channels جوه قواعد الشركات
-- - التطبيق هنا بقيمه الافتراضية: الزيادة على السعر (نسبة أو مبلغ) + العمولة
-- - كل شركة بنفعّل عندها التطبيقات اللي محتاجاها، بقيمها الخاصة (company_channels)
-- - الشركة مبتعدلش التطبيق، بتكتب أسعار أصنافها فيه بس
-- ------------------------------------------------------------
CREATE TABLE `sales_channel_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `arName` VARCHAR(100) NOT NULL,
    `enName` VARCHAR(100) NOT NULL,
    `markupType` VARCHAR(10) NOT NULL DEFAULT 'percent',
    `markupValue` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `commissionPercent` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sales_channel_templates_arName_key`(`arName`),
    UNIQUE INDEX `sales_channel_templates_enName_key`(`enName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- التطبيق عند الشركة: مفعّل ولا لأ + قيمه الخاصة بيها
CREATE TABLE `company_channels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `templateId` INTEGER NOT NULL,
    `markupType` VARCHAR(10) NOT NULL DEFAULT 'percent',
    `markupValue` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `commissionPercent` DECIMAL(7, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `company_channels_companyId_templateId_key`(`companyId`, `templateId`),
    INDEX `company_channels_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `company_channels` ADD CONSTRAINT `company_channels_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `company_channels` ADD CONSTRAINT `company_channels_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `sales_channel_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- التطبيقات المشهورة في السعودية (بتتعدّل من الشاشة)
INSERT IGNORE INTO `sales_channel_templates` (`arName`, `enName`, `sortOrder`) VALUES
    ('هنقرستيشن', 'HungerStation', 1),
    ('جاهز', 'Jahez', 2),
    ('مرسول', 'Mrsool', 3),
    ('ننجا', 'Ninja', 4),
    ('كيتا', 'Keeta', 5),
    ('ذا شفز', 'The Chefz', 6),
    ('تويو', 'ToYou', 7);
