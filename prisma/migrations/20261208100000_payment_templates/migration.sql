-- قوالب طرق الدفع

-- CreateTable
CREATE TABLE `payment_method_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `arName` VARCHAR(50) NOT NULL,
    `enName` VARCHAR(50) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `requiresReference` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_method_templates_arName_key`(`arName`),
    UNIQUE INDEX `payment_method_templates_enName_key`(`enName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
