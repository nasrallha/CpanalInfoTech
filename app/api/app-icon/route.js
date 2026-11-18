import { readFile } from "fs/promises";
import path from "path";
import { getSettings } from "@/services/settings.service";
import { circleIconSvg } from "@/lib/circle-icon";

// ============================================================
// أيقونة تبويب اللوحة: شعار المؤسسة (InfoTech) من الإعدادات في دايرة (SVG)
// ============================================================
const UPLOADS_ROOT = path.join(process.cwd(), "uploads");
const TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const notFound = () => new Response("Not found", { status: 404 });

export async function GET() {
  const logo = (await getSettings().catch(() => null))?.vendorLogo;
  if (!logo) return notFound();
  const filePath = path.join(UPLOADS_ROOT, logo);
  // حماية: جوه مجلد uploads بس
  if (!filePath.startsWith(UPLOADS_ROOT + path.sep)) return notFound();
  const type = TYPES[path.extname(filePath).toLowerCase()];
  if (!type) return notFound();
  try {
    const bytes = await readFile(filePath);
    return new Response(circleIconSvg(bytes, type), {
      headers: {
        "Content-Type": "image/svg+xml",
        // الرابط فيه اسم الملف (v) ← الشعار الجديد بيتحمّل على طول
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return notFound();
  }
}
