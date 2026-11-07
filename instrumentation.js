// ============================================================
// بيشتغل مرة واحدة لما سيرفر اللوحة يقوم
// - النسخ التلقائي لقاعدة اللوحة نفسها (كل يوم في الميعاد اللي في شاشة النسخ)
// ============================================================
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  import("./lib/panel-backup-scheduler")
    .then((m) => m.startPanelBackupScheduler())
    .catch((e) =>
      console.error("[panel-backup] scheduler start failed:", e?.message ?? e),
    );
}
