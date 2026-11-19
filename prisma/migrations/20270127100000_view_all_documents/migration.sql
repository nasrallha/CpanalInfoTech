-- صلاحية «عرض مستندات المستخدمين الآخرين» (documents.viewAll في البرنامج الأساسي)
-- كل قوالب الأدوار بتاخدها (عشان تطبيق القوالب مايشيلهاش من الشركات)
UPDATE `role_templates`
   SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'documents.viewAll'),
       `updatedAt` = CURRENT_TIMESTAMP(3)
 WHERE JSON_TYPE(`permissions`) = 'ARRAY'
   AND NOT JSON_CONTAINS(`permissions`, '"documents.viewAll"');
