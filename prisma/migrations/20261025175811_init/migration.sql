-- CreateTable
CREATE TABLE `staff_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `arName` VARCHAR(80) NOT NULL,
    `enName` VARCHAR(80) NOT NULL,
    `permissions` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `staff_roles_arName_key`(`arName`),
    UNIQUE INDEX `staff_roles_enName_key`(`enName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `arName` VARCHAR(100) NOT NULL,
    `enName` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(150) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `isOwner` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `roleId` INTEGER NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `staff_username_key`(`username`),
    INDEX `staff_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tokenHash` VARCHAR(64) NOT NULL,
    `staffId` INTEGER NOT NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `staff_sessions_tokenHash_key`(`tokenHash`),
    INDEX `staff_sessions_staffId_idx`(`staffId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `arName` VARCHAR(80) NOT NULL,
    `enName` VARCHAR(80) NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `period` VARCHAR(10) NOT NULL DEFAULT 'year',
    `maxUsers` INTEGER NULL,
    `maxBranches` INTEGER NULL,
    `maxInvoicesMonth` INTEGER NULL,
    `features` JSON NOT NULL,
    `notes` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plans_arName_key`(`arName`),
    UNIQUE INDEX `plans_enName_key`(`enName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `arName` VARCHAR(80) NOT NULL,
    `enName` VARCHAR(80) NOT NULL,
    `color` VARCHAR(20) NULL,
    `background` VARCHAR(500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `activities_arName_key`(`arName`),
    UNIQUE INDEX `activities_enName_key`(`enName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(16) NOT NULL,
    `arName` VARCHAR(150) NOT NULL,
    `enName` VARCHAR(150) NOT NULL,
    `activityId` INTEGER NULL,
    `contactName` VARCHAR(100) NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(150) NULL,
    `city` VARCHAR(80) NULL,
    `taxNo` VARCHAR(20) NULL,
    `notes` TEXT NULL,
    `logo` VARCHAR(500) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `suspendReason` VARCHAR(255) NULL,
    `suspendedAt` DATETIME(3) NULL,
    `dbName` VARCHAR(64) NOT NULL,
    `dbUser` VARCHAR(32) NOT NULL,
    `dbPasswordEnc` TEXT NOT NULL,
    `provisionedAt` DATETIME(3) NULL,
    `adminUsername` VARCHAR(50) NOT NULL,
    `adminPasswordEnc` TEXT NULL,
    `planId` INTEGER NULL,
    `maxUsers` INTEGER NULL,
    `maxBranches` INTEGER NULL,
    `maxInvoicesMonth` INTEGER NULL,
    `startsAt` DATE NOT NULL,
    `endsAt` DATE NOT NULL,
    `graceDays` INTEGER NULL,
    `readonlyDays` INTEGER NULL,
    `lastSeenAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_code_key`(`code`),
    UNIQUE INDEX `companies_dbName_key`(`dbName`),
    INDEX `companies_status_idx`(`status`),
    INDEX `companies_endsAt_idx`(`endsAt`),
    INDEX `companies_planId_idx`(`planId`),
    INDEX `companies_activityId_idx`(`activityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `companyId` INTEGER NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `planId` INTEGER NULL,
    `startsAt` DATE NULL,
    `endsAt` DATE NULL,
    `amount` DECIMAL(12, 2) NULL,
    `note` VARCHAR(500) NULL,
    `staffId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `subscription_history_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `staffId` INTEGER NULL,
    `companyId` INTEGER NULL,
    `action` VARCHAR(50) NOT NULL,
    `details` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_staffId_idx`(`staffId`),
    INDEX `audit_logs_companyId_idx`(`companyId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tokenHash` VARCHAR(64) NOT NULL,
    `companyId` INTEGER NOT NULL,
    `staffId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `support_tokens_tokenHash_key`(`tokenHash`),
    INDEX `support_tokens_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `panel_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `graceDays` INTEGER NOT NULL DEFAULT 7,
    `readonlyDays` INTEGER NOT NULL DEFAULT 14,
    `expiringDays` INTEGER NOT NULL DEFAULT 7,
    `dbPrefix` VARCHAR(20) NOT NULL DEFAULT 'erp_',
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `staff` ADD CONSTRAINT `staff_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `staff_roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_sessions` ADD CONSTRAINT `staff_sessions_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_history` ADD CONSTRAINT `subscription_history_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_history` ADD CONSTRAINT `subscription_history_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscription_history` ADD CONSTRAINT `subscription_history_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tokens` ADD CONSTRAINT `support_tokens_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_tokens` ADD CONSTRAINT `support_tokens_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
