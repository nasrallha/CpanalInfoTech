import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import mariadb from "mariadb";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { dbConfig } from "@/lib/db-config";
import { dumpDatabase } from "@/lib/db-dump";
import { executeBackup, inspectBackup } from "@/lib/db-restore";
import { migrateDatabase, readMigrations } from "@/lib/provision";
import { audit } from "./audit.service";

// ============================================================
// نسخ احتياطي لقواعد الشركات من اللوحة
// - تختار شركة أو أكتر (أو الكل) ← ملف .sql لكل شركة
// - المكان: PANEL_BACKUP_DIR في .env، وإلا مجلد backups جوه اللوحة
//   وجواه فولدر لكل شركة باسم كودها
// - الملف بنفس شكل نسخ البرنامج الأساسي (ينفع يتسترجع من جوه البرنامج)
// (النسخ التلقائي بتاع كل شركة بيفضل من جوه البرنامج نفسه، بمواعيدها)
// + نسخ قاعدة اللوحة نفسها (يدوي + تلقائي كل يوم) في فولدر _panel
// + استرجاع قاعدة شركة / قاعدة اللوحة (بصلاحيات منفصلة)
// ============================================================
export const backupRoot = () =>
  path.resolve(
    process.env.PANEL_BACKUP_DIR || path.join(process.cwd(), "backups"),
  );

const CODE_RE = /^[A-Z2-9]{8}$/;
// فولدر نسخ قاعدة اللوحة نفسها
export const PANEL_DIR = "_panel";
export const isBackupOwner = (code) =>
  CODE_RE.test(code ?? "") || code === PANEL_DIR;
const FILE_RE = /^[\w.-]+\.sql$/;
const g = globalThis;

const stamp = () => {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000); // توقيت السعودية
  return d.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
};

// ملف واحد (بحماية من ../)
export function backupFile(code, name) {
  if (!isBackupOwner(code) || !FILE_RE.test(name ?? "")) return null;
  if (path.basename(name) !== name) return null;
  return path.join(backupRoot(), code, name);
}

// كل الملفات: [{ code, name, size, createdAt }]
export async function listPanelBackups() {
  const root = backupRoot();
  let codes = [];
  try {
    codes = (await fsp.readdir(root)).filter(isBackupOwner);
  } catch {
    return { root, files: [] };
  }
  const files = [];
  for (const code of codes) {
    let names = [];
    try {
      names = (await fsp.readdir(path.join(root, code))).filter((n) =>
        FILE_RE.test(n),
      );
    } catch {
      continue;
    }
    for (const name of names) {
      try {
        const st = await fsp.stat(path.join(root, code, name));
        if (st.isFile())
          files.push({
            code,
            name,
            size: st.size,
            createdAt: st.mtime.toISOString(),
          });
      } catch {
        // اتمسح
      }
    }
  }
  files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { root, files };
}

// نسخ شركات مختارة (واحدة ورا التانية)
export async function backupCompanies({ ids }, user) {
  if (g.__cpBackupRunning) throw new AppError("BackupRunning");
  g.__cpBackupRunning = true;
  try {
    const rows = await prisma.company.findMany({
      where: { id: { in: ids }, provisionedAt: { not: null } },
      orderBy: { serialNo: "asc" },
      select: {
        id: true,
        code: true,
        arName: true,
        enName: true,
        dbName: true,
      },
    });
    const base = dbConfig();
    const results = [];
    for (const c of rows) {
      try {
        const dir = path.join(backupRoot(), c.code);
        await fsp.mkdir(dir, { recursive: true });
        const name = `panel_backup_${c.dbName}_${stamp()}.sql`;
        const r = await dumpDatabase(
          {
            host: base.host,
            port: base.port,
            user: base.user,
            password: base.password,
            database: c.dbName,
            allowPublicKeyRetrieval: true,
          },
          path.join(dir, name),
        );
        const st = await fsp.stat(path.join(dir, name));
        results.push({ ...c, ok: true, name, size: st.size, ...r });
      } catch (e) {
        results.push({
          ...c,
          error: "BackupFailed",
          details: { message: e?.message ?? "Unknown" },
        });
      }
    }
    await audit(user, "backup.run", {
      details: {
        ok: results.filter((r) => r.ok).map((r) => r.code),
        failed: results.filter((r) => r.error).map((r) => r.code),
      },
    });
    return { results: results.map(({ dbName, ...r }) => r) };
  } finally {
    g.__cpBackupRunning = false;
  }
}

export async function deletePanelBackup({ code, name }, user) {
  const file = backupFile(code, name);
  if (!file || !fs.existsSync(file)) throw new AppError("NotFound");
  await fsp.unlink(file);
  await audit(user, "backup.delete", { details: { code, name } });
  return { ok: true };
}

// ============================================================
// قاعدة اللوحة نفسها
// ============================================================
const panelCfg = () => {
  const b = dbConfig();
  return {
    host: b.host,
    port: b.port,
    user: b.user,
    password: b.password,
    database: b.database,
    allowPublicKeyRetrieval: true,
  };
};

async function dumpPanel(prefix) {
  const dir = path.join(backupRoot(), PANEL_DIR);
  await fsp.mkdir(dir, { recursive: true });
  const name = `${prefix}_${stamp()}.sql`;
  const r = await dumpDatabase(panelCfg(), path.join(dir, name));
  const st = await fsp.stat(path.join(dir, name));
  return { name, size: st.size, ...r };
}

// نسخة من قاعدة اللوحة: يدوي (زرار) أو تلقائي (كل يوم)
// التلقائي: بيتساب آخر panelBackupKeep نسخة تلقائية بس (اليدوي ما بيتمسحش)
const AUTO_PREFIX = "panel_auto";
export async function backupPanel(user, { auto = false } = {}) {
  if (g.__cpBackupRunning || g.__cpRestoreRunning)
    throw new AppError("BackupRunning");
  g.__cpBackupRunning = true;
  try {
    const r = await dumpPanel(auto ? AUTO_PREFIX : "panel_backup");
    if (auto) await prunePanelAuto();
    else await audit(user, "backup.panel", { details: { name: r.name } });
    return r;
  } finally {
    g.__cpBackupRunning = false;
  }
}

async function prunePanelAuto() {
  const s = await prisma.panelSettings.findUnique({
    where: { id: 1 },
    select: { panelBackupKeep: true },
  });
  const keep = s?.panelBackupKeep ?? 14;
  if (!keep) return;
  const dir = path.join(backupRoot(), PANEL_DIR);
  const autos = (await fsp.readdir(dir))
    .filter((n) => n.startsWith(`${AUTO_PREFIX}_`) && FILE_RE.test(n))
    .sort()
    .reverse();
  for (const n of autos.slice(keep))
    await fsp.unlink(path.join(dir, n)).catch(() => {});
}

// مواعيد النسخ التلقائي لقاعدة اللوحة
export async function getPanelBackupSchedule() {
  const s = await prisma.panelSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
    select: {
      panelBackupEnabled: true,
      panelBackupTime: true,
      panelBackupKeep: true,
      panelBackupLastAt: true,
      panelBackupLastOk: true,
      panelBackupLastError: true,
    },
  });
  return s;
}

export async function savePanelBackupSchedule(data, user) {
  await prisma.panelSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  await audit(user, "backup.schedule", { details: data });
  return getPanelBackupSchedule();
}

// ============================================================
// الاسترجاع
// ============================================================
const sameOrNewer = (fileMigrations, known) => {
  const set = new Set(known);
  return fileMigrations.filter((m) => !set.has(m));
};

async function inspectOrThrow(file, mustHave) {
  try {
    await fsp.access(file);
  } catch {
    throw new AppError("BackupNotFound");
  }
  const info = await inspectBackup(file);
  if (!info.valid || !info.tables.length)
    throw new AppError("BackupFormatUnknown");
  // نسخة من النوع الصح (شركة / لوحة)؟
  if (!mustHave.every((t) => info.tables.includes(t)))
    throw new AppError("BackupWrongKind");
  return info;
}

// ------------------------------------------------------------
// استرجاع قاعدة شركة (من نسخها في فولدرها: نسخ اللوحة أو ملف مرفوع)
// 1) نسخة أمان من الوضع الحالي (before_restore_...) ← لو الاسترجاع فشل بترجع لوحدها
// 2) جداول الاشتراك ما تتلمسش (اللوحة هي اللي بتكتبها) - لو موجودة في القاعدة
//    (قاعدة فاضية: بتتعمل من النسخة، وبعدين اللوحة بتكتب الاشتراك)
// 3) النسخة أقدم من البرنامج: التحديثات الناقصة بتتعمل تلقائياً، وأحدث: مرفوضة
// 4) سلسلة الزكاة (ICV) ما ترجعش لورا (نفس الشهادة)
// 5) كل مستخدمي الشركة يخرجوا + مزامنة بيانات اللوحة للشركة
// ------------------------------------------------------------
const COMPANY_KEEP = ["subscription", "subscription_log"];

async function query(cfg, sql, params) {
  const conn = await mariadb.createConnection({
    ...cfg,
    connectTimeout: 10000,
  });
  try {
    return await conn.query(sql, params);
  } finally {
    await conn.end().catch(() => {});
  }
}

// جداول الاشتراك اللي موجودة فعلاً في القاعدة دي (هي بس اللي ما تتلمسش)
// قاعدة فاضية (سيرفر جديد): مفيش جداول اشتراك ← بتتعمل من النسخة،
// وإلا التحديثات اللي بتعدّل عليها بتفشل (Table 'subscription' doesn't exist)
// وبيانات الاشتراك نفسها بتتكتب من اللوحة بعد الاسترجاع (trySync)
async function keepTablesIn(cfg) {
  try {
    const rows = await query(
      cfg,
      "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?, ?)",
      [cfg.database, ...COMPANY_KEEP],
    );
    return rows.map((r) => r.t);
  } catch {
    return COMPANY_KEEP;
  }
}

async function zatcaChains(cfg) {
  try {
    return await query(
      cfg,
      "SELECT branchId, certSerial, icv, lastHash, environment FROM `zatca_units`",
    );
  } catch {
    return [];
  }
}

export async function restoreCompany({ id, name, confirm }, user) {
  const c = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      arName: true,
      dbName: true,
      provisionedAt: true,
    },
  });
  if (!c?.provisionedAt) throw new AppError("NotProvisioned");
  if (
    String(confirm ?? "")
      .trim()
      .toUpperCase() !== c.code
  )
    throw new AppError("ConfirmMismatch");
  const file = backupFile(c.code, name);
  if (!file) throw new AppError("BackupNotFound");
  const info = await inspectOrThrow(file, ["system_settings", "branches"]);
  const known = readMigrations().map((m) => m.name);
  const newer = sameOrNewer(info.migrations, known);
  if (newer.length)
    throw new AppError("BackupNewerThanProgram", { count: newer.length });

  if (g.__cpBackupRunning || g.__cpRestoreRunning)
    throw new AppError("BackupRunning");
  g.__cpRestoreRunning = true;
  const started = Date.now();
  try {
    const base = panelCfg();
    const cfg = { ...base, database: c.dbName };
    const chainsBefore = await zatcaChains(cfg);
    const keepTables = await keepTablesIn(cfg);

    // 1) نسخة أمان
    const dir = path.join(backupRoot(), c.code);
    await fsp.mkdir(dir, { recursive: true });
    const safety = `before_restore_${c.dbName}_${stamp()}.sql`;
    await dumpDatabase(cfg, path.join(dir, safety));

    // 2) التنفيذ (ولو فشل: نرجّع نسخة الأمان)
    try {
      await executeBackup(file, info, cfg, keepTables);
    } catch (error) {
      console.error("[restore] failed, rolling back:", error?.message ?? error);
      try {
        const sf = path.join(dir, safety);
        await executeBackup(sf, await inspectBackup(sf), cfg, keepTables);
      } catch (e2) {
        console.error("[restore] ROLLBACK FAILED:", e2?.message ?? e2);
        throw new AppError("RestoreRollbackFailed", { safety });
      }
      throw new AppError("RestoreFailed", { message: error?.message ?? null });
    }

    // 3) التحديثات الناقصة
    let migrated = 0;
    let migrateOk = true;
    try {
      migrated = (await migrateDatabase(c.dbName)).applied;
    } catch (e) {
      migrateOk = false;
      console.error("[restore] migrate failed:", e?.details ?? e?.message);
    }

    // 4) سلسلة الزكاة: منرجعش لورا (نفس الفرع ونفس الشهادة)
    let zatcaGap = 0;
    const after = await zatcaChains(cfg);
    for (const b of chainsBefore) {
      const a = after.find(
        (x) =>
          x.branchId === b.branchId &&
          x.certSerial &&
          x.certSerial === b.certSerial,
      );
      if (a && Number(a.icv) < Number(b.icv)) {
        if (b.environment === "production")
          zatcaGap += Number(b.icv) - Number(a.icv);
        await query(
          cfg,
          "UPDATE `zatca_units` SET icv = ?, lastHash = ? WHERE branchId = ?",
          [b.icv, b.lastHash, b.branchId],
        );
      }
    }

    // 5) كل المستخدمين يخرجوا + بيانات اللوحة (الاشتراك والمميزات...) ترجع للشركة
    await query(cfg, "DELETE FROM `sessions`").catch(() => {});
    const { trySync } = await import("./company.service");
    await trySync(c.id);

    const result = {
      name,
      safety,
      migrated,
      migrateOk,
      zatcaGap,
      seconds: Math.round((Date.now() - started) / 1000),
    };
    await audit(user, "backup.restore", {
      companyId: c.id,
      details: { name, safety, migrated, zatcaGap },
    });
    return result;
  } finally {
    g.__cpRestoreRunning = false;
  }
}

// ------------------------------------------------------------
// استرجاع قاعدة اللوحة نفسها (صلاحية لوحدها)
// - نسخة أمان من الوضع الحالي، ولو فشل بترجع لوحدها
// - جلسات الدخول ما تتلمسش (عشان اللي بيسترجع يفضل داخل)
// - النسخة أقدم: prisma migrate deploy، وأحدث: مرفوضة
// ------------------------------------------------------------
const PANEL_KEEP = ["staff_sessions"];
const PANEL_MIGRATIONS = path.join(process.cwd(), "prisma", "migrations");

async function panelMigrations() {
  try {
    return (await fsp.readdir(PANEL_MIGRATIONS, { withFileTypes: true }))
      .filter((e) => e.isDirectory() && /^\d{14}_/.test(e.name))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function runMigrateDeploy() {
  return new Promise((resolve) => {
    const cli = path.join(
      process.cwd(),
      "node_modules",
      "prisma",
      "build",
      "index.js",
    );
    if (!fs.existsSync(cli))
      return resolve({ ok: false, output: "prisma CLI not found" });
    const child = spawn(process.execPath, [cli, "migrate", "deploy"], {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    const timer = setTimeout(() => child.kill(), 5 * 60_000);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, output: output.slice(-2000) });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, output: String(e?.message ?? e) });
    });
  });
}

export const PANEL_CONFIRM = "PANEL";

export async function restorePanel({ name, confirm }, user) {
  if (
    String(confirm ?? "")
      .trim()
      .toUpperCase() !== PANEL_CONFIRM
  )
    throw new AppError("ConfirmMismatch");
  const file = backupFile(PANEL_DIR, name);
  if (!file) throw new AppError("BackupNotFound");
  const info = await inspectOrThrow(file, ["companies", "panel_settings"]);
  const known = await panelMigrations();
  const newer = sameOrNewer(info.migrations, known);
  if (newer.length)
    throw new AppError("BackupNewerThanProgram", { count: newer.length });
  const missing = known.filter((m) => !info.migrations.includes(m));

  if (g.__cpBackupRunning || g.__cpRestoreRunning)
    throw new AppError("BackupRunning");
  g.__cpRestoreRunning = true;
  const started = Date.now();
  try {
    const cfg = panelCfg();
    // 1) نسخة أمان
    const safety = (await dumpPanel("panel_before_restore")).name;
    // 2) التنفيذ (ولو فشل: نرجّع نسخة الأمان)
    try {
      await executeBackup(file, info, cfg, PANEL_KEEP);
    } catch (error) {
      console.error(
        "[restore-panel] failed, rolling back:",
        error?.message ?? error,
      );
      try {
        const sf = path.join(backupRoot(), PANEL_DIR, safety);
        await executeBackup(sf, await inspectBackup(sf), cfg, PANEL_KEEP);
      } catch (e2) {
        console.error("[restore-panel] ROLLBACK FAILED:", e2?.message ?? e2);
        throw new AppError("RestoreRollbackFailed", { safety });
      }
      throw new AppError("RestoreFailed", { message: error?.message ?? null });
    }
    // 3) التحديثات الناقصة
    let migrateOk = true;
    if (missing.length) {
      const m = await runMigrateDeploy();
      migrateOk = m.ok;
      if (!m.ok) console.error("[restore-panel] migrate failed:", m.output);
    }
    await audit(user, "backup.restorePanel", {
      details: { name, safety, migrated: missing.length },
    });
    return {
      name,
      safety,
      migrated: missing.length,
      migrateOk,
      seconds: Math.round((Date.now() - started) / 1000),
    };
  } finally {
    g.__cpRestoreRunning = false;
  }
}

// ------------------------------------------------------------
// رفع ملف للاسترجاع: بيتحفظ في فولدر الشركة / اللوحة باسم uploaded_...
// (بيتنادى من app/api/backups/upload/route.js)
// ------------------------------------------------------------
export async function saveUploadedBackup(code, originalName, stream) {
  if (!isBackupOwner(code)) throw new AppError("NotFound");
  const dir = path.join(backupRoot(), code);
  await fsp.mkdir(dir, { recursive: true });
  const base = String(originalName || "file")
    .replace(/\.sql$/i, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 60);
  const name = `uploaded_${stamp()}_${base}.sql`;
  const file = path.join(dir, name);
  await pipeline(stream, fs.createWriteStream(file));
  const info = await inspectBackup(file);
  if (!info.valid) {
    await fsp.unlink(file).catch(() => {});
    throw new AppError("BackupFormatUnknown");
  }
  return { name };
}
