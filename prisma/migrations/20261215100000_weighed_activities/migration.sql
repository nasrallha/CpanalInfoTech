-- أنشطة الأصناف الموزونة (بنفس شاشات التجزئة العادية، من غير وحدات إضافية)
-- البيع بالوزن أو بالحبة بالوحدات (كيلو / جرام / مللي / حبة) + باركود الميزان
-- (الميزان بيتفعّل من الإعدادات العامة في البرنامج)
-- لو النشاط موجود بنفس الاسم مش بيتكرر
INSERT IGNORE INTO `activities` (`arName`, `enName`, `modules`, `isActive`, `createdAt`, `updatedAt`) VALUES
  ('الخضار والفاكهة واللحوم والدواجن', 'Vegetables, fruit, meat & poultry', JSON_ARRAY(), true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('المخابز والحلويات', 'Bakeries & sweets', JSON_ARRAY(), true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('العطور والبخور والعطارة', 'Perfumes, incense & herbs', JSON_ARRAY(), true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
