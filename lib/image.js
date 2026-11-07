// إعدادات الصور المشتركة بين الواجهة والسيرفر
export const MAX_IMAGE_SIZE_MB = 2;
export const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// الصورة بتتحفظ في القاعدة كمسار زي: activities/abc.webp
// وبتتعرض من الرابط: /api/uploads/activities/abc.webp
// (البرنامج الأساسي بيعرضها من رابط اللوحة الكامل)
export function imageUrl(path) {
  if (!path) return null;
  // رابط كامل (قديم) زي ما هو
  if (/^https?:\/\//i.test(path)) return path;
  return `/api/uploads/${path}`;
}
