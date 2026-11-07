// تنزيل نسخة احتياطية من اللوحة: /api/backups/<الكود>/<الملف>
// بصلاحية backups.manage بس (الملف فيه كل بيانات الشركة)
import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { backupFile } from "@/services/backup.service";

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !can(user, "backups.manage"))
    return new Response("Forbidden", { status: 403 });
  const { code, name } = await params;
  const file = backupFile(code, decodeURIComponent(name));
  if (!file) return notFound();
  try {
    const st = await fsp.stat(file);
    if (!st.isFile()) return notFound();
    return new Response(Readable.toWeb(fs.createReadStream(file)), {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Length": String(st.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return notFound();
  }
}
