// ============================================================
// النسخ التلقائي لقاعدة اللوحة (كل يوم الساعة panelBackupTime بتوقيت السعودية)
// - بيكشف كل دقيقة: الميعاد جه والنسخة التلقائية بتاعة النهارده لسه ما اتعملتش؟
// - لو البرنامج كان مقفول وقت الميعاد: أول ما يقوم في نفس اليوم بيعملها
// - النتيجة بتتسجل في الإعدادات (آخر نسخة / نجحت؟ / الخطأ)
// ============================================================
import { prisma } from "./prisma";

const g = globalThis;
const TZ_MS = 3 * 60 * 60 * 1000; // توقيت السعودية
const riyadh = (d = new Date()) =>
  new Date(new Date(d).getTime() + TZ_MS).toISOString();

async function tick() {
  if (g.__cpPanelBackupTick) return;
  g.__cpPanelBackupTick = true;
  try {
    const s = await prisma.panelSettings.findUnique({
      where: { id: 1 },
      select: {
        panelBackupEnabled: true,
        panelBackupTime: true,
        panelBackupLastAt: true,
      },
    });
    // من غير صف إعدادات: الافتراضي شغال الساعة 03:00
    const enabled = s?.panelBackupEnabled ?? true;
    if (!enabled) return;
    const time = s?.panelBackupTime ?? "03:00";
    const now = riyadh();
    const today = now.slice(0, 10);
    if (now.slice(11, 16) < time) return;
    if (
      s?.panelBackupLastAt &&
      riyadh(s.panelBackupLastAt).slice(0, 10) === today
    )
      return;

    const { backupPanel } = await import("@/services/backup.service");
    let ok = true;
    let error = null;
    try {
      const r = await backupPanel(null, { auto: true });
      console.log("[panel-backup] done:", r.name);
    } catch (e) {
      // في نسخ تاني شغال دلوقتي: نحاول الدقيقة الجاية
      if (e?.code === "BackupRunning") return;
      ok = false;
      error = String(e?.message ?? e).slice(0, 500);
      console.error("[panel-backup] failed:", error);
    }
    await prisma.panelSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        panelBackupLastAt: new Date(),
        panelBackupLastOk: ok,
        panelBackupLastError: error,
      },
      update: {
        panelBackupLastAt: new Date(),
        panelBackupLastOk: ok,
        panelBackupLastError: error,
      },
    });
  } catch (e) {
    console.error("[panel-backup] check failed:", e?.message ?? e);
  } finally {
    g.__cpPanelBackupTick = false;
  }
}

export function startPanelBackupScheduler() {
  if (g.__cpPanelBackupTimer) return;
  g.__cpPanelBackupTimer = setInterval(tick, 60_000);
  g.__cpPanelBackupTimer.unref?.();
  // أول كشف بعد ما البرنامج يقوم بدقيقة
  setTimeout(tick, 60_000).unref?.();
}
