-- نشاط الملابس والأحذية والأقمشة: شاشات التجزئة + وحدة المقاسات والألوان
-- (الأقمشة بوحدة المتر بكسور، والملابس والأحذية بالمقاسات)
INSERT IGNORE INTO `activities` (`arName`, `enName`, `modules`, `isActive`, `createdAt`, `updatedAt`) VALUES
  ('الملابس والأحذية والأقمشة', 'Clothing, shoes & fabrics', JSON_ARRAY('variants'), true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
