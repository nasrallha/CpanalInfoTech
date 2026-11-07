import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { erpPermissions } from "@/lib/erp-meta";
import {
  applyRoleTemplates,
  databasesWithRoles,
  readRolesFromDb,
} from "@/lib/provision";
import { audit } from "./audit.service";

// ============================================================
// قوالب الأدوار (كاشير، محاسب...) ← أدوار ثابتة مقفولة عند الشركات
// - بتنزل لوحدها مع "إنشاء القاعدة" لأي شركة جديدة
// - التعديل بعد كده: إنت بتختار الشركات اللي ينزل عندها ("تطبيق على الشركات")
// ============================================================

export const getRoleTemplates = () =>
  prisma.roleTemplate.findMany({ orderBy: { id: "asc" } });

// الصلاحيات المسموحة (من البرنامج الأساسي، من غير صلاحيات المالك)
async function cleanPermissions(list) {
  const meta = await erpPermissions();
  const allowed = new Set(meta?.all ?? []);
  return [...new Set(list ?? [])].filter((p) => !meta || allowed.has(p));
}

export async function createRoleTemplate(data, user) {
  const t = await prisma.roleTemplate.create({
    data: { ...data, permissions: await cleanPermissions(data.permissions) },
    select: { id: true },
  });
  await audit(user, "roleTemplate.create", { details: { name: data.arName } });
  return t;
}

export async function updateRoleTemplate({ id, ...data }, user) {
  await prisma.roleTemplate.update({
    where: { id },
    data: { ...data, permissions: await cleanPermissions(data.permissions) },
  });
  await audit(user, "roleTemplate.update", { details: { name: data.arName } });
  return { id };
}

export async function deleteRoleTemplate(id, user) {
  const t = await prisma.roleTemplate.findUnique({
    where: { id },
    select: { arName: true },
  });
  if (!t) throw new AppError("NotFound");
  await prisma.roleTemplate.delete({ where: { id } });
  await audit(user, "roleTemplate.delete", { details: { name: t.arName } });
  return { id };
}

// ------------------------------------------------------------
// استيراد من قاعدة (زي FirstPos): الأدوار العادية بصلاحياتها
// اسم موجود ← بيتحدّث، جديد ← بيتضاف
// ------------------------------------------------------------
export const getImportableDatabases = () => databasesWithRoles();

export async function importRoleTemplates({ dbName }, user) {
  const roles = await readRolesFromDb(dbName);
  let created = 0;
  let updated = 0;
  for (const r of roles) {
    const permissions = await cleanPermissions(r.permissions);
    const existing = await prisma.roleTemplate.findFirst({
      where: { OR: [{ arName: r.arName }, { enName: r.enName }] },
      select: { id: true },
    });
    if (existing) {
      await prisma.roleTemplate.update({
        where: { id: existing.id },
        data: { arName: r.arName, enName: r.enName, permissions },
      });
      updated++;
    } else {
      await prisma.roleTemplate.create({
        data: {
          arName: r.arName,
          enName: r.enName,
          isActive: r.isActive,
          permissions,
        },
      });
      created++;
    }
  }
  await audit(user, "roleTemplate.import", {
    details: { dbName, created, updated },
  });
  return { created, updated };
}

// ------------------------------------------------------------
// تطبيق القوالب على قاعدة شركة / شركات مختارة
// ------------------------------------------------------------
export async function applyTemplatesToCompany(companyId) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { dbName: true, provisionedAt: true },
  });
  if (!c?.provisionedAt) throw new AppError("NotProvisioned");
  const templates = await getRoleTemplates();
  return applyRoleTemplates(c.dbName, templates);
}

export async function applyTemplatesToCompanies({ ids }, user) {
  const rows = await prisma.company.findMany({
    where: { id: { in: ids }, provisionedAt: { not: null } },
    orderBy: { serialNo: "asc" },
    select: { id: true, code: true, arName: true, enName: true },
  });
  const results = [];
  for (const c of rows) {
    try {
      await applyTemplatesToCompany(c.id);
      results.push({ ...c, ok: true });
    } catch (e) {
      results.push({
        ...c,
        error: e instanceof AppError ? e.code : "TemplatesFailed",
        details:
          e instanceof AppError
            ? e.details
            : { message: e?.message ?? "Unknown" },
      });
    }
  }
  await audit(user, "roleTemplate.apply", {
    details: {
      companies: results.filter((r) => r.ok).map((r) => r.code),
      failed: results.filter((r) => r.error).map((r) => r.code),
    },
  });
  return { results };
}
