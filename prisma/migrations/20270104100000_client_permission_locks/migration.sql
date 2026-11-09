-- ------------------------------------------------------------
-- صلاحيات مقفولة على العملاء (حتى مدير النظام عندهم) ← للمالك بس
-- - panel_settings.clientBlockedPermissions: القايمة العامة لكل الشركات
--   (فاضي = القايمة الافتراضية من الكود)
-- - companies.blockedPermissions: استثناء لشركة (فاضي = زي القايمة العامة)
-- ------------------------------------------------------------
ALTER TABLE `panel_settings`
    ADD COLUMN `clientBlockedPermissions` JSON NULL;

ALTER TABLE `companies`
    ADD COLUMN `blockedPermissions` JSON NULL;
