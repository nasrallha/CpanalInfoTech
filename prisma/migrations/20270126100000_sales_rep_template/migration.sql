-- المناديب والعمولات (وحدة salesReps في البرنامج الأساسي):
-- قالب دور «مندوب» ياخد صلاحية «مندوب مبيعات» (عشان تطبيق القوالب مايشيلهاش من الشركات)
UPDATE `role_templates`
   SET `permissions` = JSON_ARRAY_APPEND(`permissions`, '$', 'salesReps.rep'),
       `updatedAt` = CURRENT_TIMESTAMP(3)
 WHERE (`arName` = 'مندوب' OR `enName` IN ('delegate', 'Delegate', 'Sales rep', 'Sales representative'))
   AND JSON_TYPE(`permissions`) = 'ARRAY'
   AND NOT JSON_CONTAINS(`permissions`, '"salesReps.rep"');
