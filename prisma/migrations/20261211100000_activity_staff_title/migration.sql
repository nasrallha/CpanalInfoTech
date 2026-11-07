-- اسم مقدم الخدمة في البرنامج حسب النشاط (فني / عاملة / حلاق / معالج)
ALTER TABLE `activities` ADD COLUMN `staffTitle` VARCHAR(12) NULL;
