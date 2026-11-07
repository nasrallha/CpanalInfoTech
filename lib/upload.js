import "server-only";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { AppError } from "./errors";
import { MAX_IMAGE_SIZE } from "./image";

// الصور المرفوعة بتتحفظ في مجلد uploads في جذر اللوحة
// (مش في public، لأن Next في الإنتاج مبيعرضش الملفات اللي اتضافت لـ public بعد البناء)
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

// نوع الصورة من أول بايتات الملف (أدق من الاسم أو النوع اللي المتصفح بيبعته)
function detectImageExt(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return ".jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return ".png";
  if (
    bytes.slice(0, 4).toString("ascii") === "RIFF" &&
    bytes.slice(8, 12).toString("ascii") === "WEBP"
  )
    return ".webp";
  return null;
}

// saveImage(file, "activities") ← "activities/3f2a....webp"
export async function saveImage(file, folder) {
  if (file.size > MAX_IMAGE_SIZE) throw new AppError("ImageTooLarge");
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = detectImageExt(bytes);
  if (!ext) throw new AppError("AllowedImageTypes");
  const dir = path.join(UPLOADS_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, fileName), bytes);
  return `${folder}/${fileName}`;
}

// حذف صورة (لو موجودة)، ومبيرميش خطأ لو مش موجودة
export async function deleteImage(relativePath) {
  if (!relativePath || /^https?:\/\//i.test(relativePath)) return;
  const fullPath = path.join(UPLOADS_ROOT, relativePath);
  if (!fullPath.startsWith(UPLOADS_ROOT + path.sep)) return;
  try {
    await unlink(fullPath);
  } catch {
    // مش موجودة: مفيش مشكلة
  }
}
