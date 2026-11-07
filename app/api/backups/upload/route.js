// رفع ملف نسخة احتياطية للاسترجاع: POST /api/backups/upload?code=<كود الشركة أو _panel>
// الملف نفسه في الـ body (من غير multipart)، واسمه في الهيدر x-file-name
// بيتحفظ في فولدر الشركة / اللوحة، وبعدها يتسترجع من شاشة النسخ
// الصلاحية: استرجاع قواعد الشركات (backups.restore) أو استرجاع اللوحة (backups.restorePanel)
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  PANEL_DIR,
  isBackupOwner,
  saveUploadedBackup,
} from "@/services/backup.service";
import { audit } from "@/services/audit.service";

const fail = (error, status = 400) =>
  Response.json({ success: false, error }, { status });

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return fail("SessionExpired", 401);
  const code = new URL(request.url).searchParams.get("code") ?? "";
  if (!isBackupOwner(code)) return fail("NotFound", 404);
  const panel = code === PANEL_DIR;
  if (!can(user, panel ? "backups.restorePanel" : "backups.restore"))
    return fail("Forbidden", 403);
  if (!panel) {
    const c = await prisma.company.findUnique({
      where: { code },
      select: { id: true, provisionedAt: true },
    });
    if (!c?.provisionedAt) return fail("NotProvisioned", 404);
  }
  if (!request.body) return fail("BackupFormatUnknown");
  const original = decodeURIComponent(
    request.headers.get("x-file-name") ?? "file.sql",
  );
  try {
    const r = await saveUploadedBackup(
      code,
      original,
      Readable.fromWeb(request.body),
    );
    await audit(user, "backup.upload", { details: { code, name: r.name } });
    return Response.json({ success: true, data: r });
  } catch (e) {
    if (e instanceof AppError) return fail(e.code);
    console.error("[backup-upload]", e?.message ?? e);
    return fail("UploadFailed", 500);
  }
}
