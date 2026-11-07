-- رقم العميل (serialNo): مستقل عن id
-- الشركات الموجودة بتاخد 1، 2، 3... بترتيب إنشائها

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `serialNo` INTEGER NULL;

UPDATE `companies` c
  JOIN (SELECT `id`, ROW_NUMBER() OVER (ORDER BY `id`) AS rn FROM `companies`) x
  ON x.`id` = c.`id`
SET c.`serialNo` = x.rn;

ALTER TABLE `companies` MODIFY `serialNo` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `companies_serialNo_key` ON `companies`(`serialNo`);
