-- نشاط المقاولات: العقود (مع الملاك ومقاولي الباطن) والمقايسات والمستخلصات وأوامر التغيير
-- (وحدة contracting في البرنامج الأساسي)
INSERT IGNORE INTO `activities` (`arName`, `enName`, `modules`, `isActive`, `createdAt`, `updatedAt`) VALUES
  ('المقاولات', 'Contracting', JSON_ARRAY('contracting'), true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
