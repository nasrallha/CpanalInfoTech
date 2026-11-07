import "server-only";
import fs from "node:fs";
import path from "node:path";

// ============================================================
// صلاحيات البرنامج الأساسي (لشاشة قوالب الأدوار)
// بنقراها من ملفات البرنامج نفسه، فأي صلاحية جديدة هناك بتظهر هنا لوحدها:
//   <البرنامج>/lib/permissions.js        ← المجموعات والعمليات وصلاحيات المالك
//   <البرنامج>/messages/ar.json و en.json ← الأسماء
// مكان البرنامج: من ERP_MIGRATIONS_DIR (<البرنامج>/prisma/migrations)
// ============================================================
export function erpDir() {
  const m = process.env.ERP_MIGRATIONS_DIR;
  return m ? path.resolve(m, "..", "..") : null;
}

const g = globalThis;

async function loadModule(file) {
  // الملف ESM من غير imports: نشغّله كـ data URL (من غير ما الـ bundler يلمسه)
  const src = fs.readFileSync(file, "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(src).toString("base64")}`;
  const dynamicImport = new Function("u", "return import(u)");
  return dynamicImport(url);
}

// { groups: [{ key, actions: [...] }], labels: { ar: {groups, actions}, en: ... } }
// صلاحيات مالك البرنامج مستبعدة (مبتتديش لأي دور)
export async function erpPermissions() {
  const dir = erpDir();
  if (!dir) return null;
  const file = path.join(dir, "lib", "permissions.js");
  if (!fs.existsSync(file)) return null;
  const mtime = fs.statSync(file).mtimeMs;
  if (g.__cpErpPerms?.mtime === mtime) return g.__cpErpPerms.value;

  const mod = await loadModule(file);
  const owner = mod.OWNER_PERMISSIONS ?? new Set();
  const groups = mod.PERMISSION_GROUPS.map((gr) => ({
    key: gr.key,
    actions: gr.actions.filter((a) => !owner.has(`${gr.key}.${a}`)),
  })).filter((gr) => gr.actions.length);

  const labels = {};
  for (const lang of ["ar", "en"]) {
    try {
      const m = JSON.parse(
        fs.readFileSync(path.join(dir, "messages", `${lang}.json`), "utf8"),
      );
      labels[lang] = {
        groups: m.Permissions?.groups ?? {},
        actions: m.Permissions?.actions ?? {},
      };
    } catch {
      labels[lang] = { groups: {}, actions: {} };
    }
  }
  const value = {
    groups,
    labels,
    all: groups.flatMap((gr) => gr.actions.map((a) => `${gr.key}.${a}`)),
  };
  g.__cpErpPerms = { mtime, value };
  return value;
}

// مميزات الباقات من البرنامج الأساسي: [{ key, ar, en, permissions }]
// null = ملفات البرنامج مش موجودة (بنرجع للقايمة الاحتياطية)
export async function erpPlanCatalog() {
  const dir = erpDir();
  if (!dir) return null;
  const file = path.join(dir, "lib", "plan-catalog.js");
  if (!fs.existsSync(file)) return null;
  const mtime = fs.statSync(file).mtimeMs;
  if (g.__cpErpCatalog?.mtime === mtime) return g.__cpErpCatalog.value;
  const mod = await loadModule(file);
  const value = mod.PLAN_CATALOG.map((f) => ({
    key: f.key,
    ar: f.ar,
    en: f.en,
  }));
  g.__cpErpCatalog = { mtime, value };
  return value;
}

// وحدات الأنشطة من البرنامج الأساسي: [{ key, ar, en }]
// [] = ملفات البرنامج مش موجودة أو نسخة قديمة من غير وحدات
export async function erpModuleCatalog() {
  const dir = erpDir();
  if (!dir) return [];
  const file = path.join(dir, "lib", "module-catalog.js");
  if (!fs.existsSync(file)) return [];
  const mtime = fs.statSync(file).mtimeMs;
  if (g.__cpErpModules?.mtime === mtime) return g.__cpErpModules.value;
  const mod = await loadModule(file);
  const value = mod.MODULE_CATALOG.map((m) => ({
    key: m.key,
    ar: m.ar,
    en: m.en,
  }));
  g.__cpErpModules = { mtime, value };
  return value;
}

// المفاتيح المعروفة بس (من غير تكرار)
// undefined = الكتالوج مش متاح (منلمسش القيمة المحفوظة)
export async function cleanModules(list) {
  const catalog = await erpModuleCatalog().catch(() => []);
  if (!catalog.length) return undefined;
  const known = new Set(catalog.map((m) => m.key));
  return [...new Set(list ?? [])].filter((k) => known.has(k));
}
