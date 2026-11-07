-- قوالب الأدوار

-- CreateTable
CREATE TABLE `role_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `arName` VARCHAR(50) NOT NULL,
    `enName` VARCHAR(50) NOT NULL,
    `permissions` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_templates_arName_key`(`arName`),
    UNIQUE INDEX `role_templates_enName_key`(`enName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
