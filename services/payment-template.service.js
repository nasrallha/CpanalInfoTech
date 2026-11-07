import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  applyPaymentTemplates,
  databasesWithPaymentMethods,
  readPaymentMethodsFromDb,
} from "@/lib/provision";
import { audit } from "./audit.service";

// ============================================================
// قوالب طرق الدفع (نقدي، شبكة، تحويل...) ← طرق دفع ثابتة عند الشركات
// - بتنزل لوحدها مع "إنشاء القاعدة" لأي شركة جديدة
// - التعديل بعد كده: "تطبيق على الشركات" وتختار الشركات
// - الشركة تقدر توقف الطريقة وتشغّلها بس (حالتها بتاعتها)
// ============================================================

export const getPaymentTemplates = () =>
  prisma.paymentMethodTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

function handleUnique(e) {
  if (e?.code === "P2002") throw new AppError("PaymentTemplateNameExists");
  throw e;
}

export async function createPaymentTemplate(data, user) {
  let t;
  try {
    t = await prisma.paymentMethodTemplate.create({
      data,
      select: { id: true },
    });
  } catch (e) {
    handleUnique(e);
  }
  await audit(user, "paymentTemplate.create", {
    details: { name: data.arName },
  });
  return t;
}

export async function updatePaymentTemplate({ id, ...data }, user) {
  try {
    await prisma.paymentMethodTemplate.update({ where: { id }, data });
  } catch (e) {
    if (e?.code === "P2025") throw new AppError("NotFound");
    handleUnique(e);
  }
  await audit(user, "paymentTemplate.update", {
    details: { name: data.arName },
  });
  return { id };
}

export async function deletePaymentTemplate(id, user) {
  const t = await prisma.paymentMethodTemplate.findUnique({
    where: { id },
    select: { arName: true },
  });
  if (!t) throw new AppError("NotFound");
  await prisma.paymentMethodTemplate.delete({ where: { id } });
  await audit(user, "paymentTemplate.delete", { details: { name: t.arName } });
  return { id };
}

// ------------------------------------------------------------
// استيراد من قاعدة (زي FirstPos): الاسم الموجود بيتحدّث، الجديد بيتضاف
// ------------------------------------------------------------
const TYPES = new Set(["cash", "card", "wallet", "transfer", "credit"]);

export const getPaymentImportDatabases = () => databasesWithPaymentMethods();

export async function importPaymentTemplates({ dbName }, user) {
  const rows = await readPaymentMethodsFromDb(dbName);
  let created = 0;
  let updated = 0;
  for (const r of rows) {
    if (!TYPES.has(r.type)) continue;
    const data = {
      arName: r.arName,
      enName: r.enName,
      type: r.type,
      requiresReference: r.requiresReference,
      sortOrder: r.sortOrder,
    };
    const existing = await prisma.paymentMethodTemplate.findFirst({
      where: { OR: [{ arName: r.arName }, { enName: r.enName }] },
      select: { id: true },
    });
    try {
      if (existing) {
        await prisma.paymentMethodTemplate.update({
          where: { id: existing.id },
          data,
        });
        updated++;
      } else {
        await prisma.paymentMethodTemplate.create({
          data: { ...data, isActive: r.isActive },
        });
        created++;
      }
    } catch (e) {
      handleUnique(e);
    }
  }
  await audit(user, "paymentTemplate.import", {
    details: { dbName, created, updated },
  });
  return { created, updated };
}

// ------------------------------------------------------------
// تطبيق القوالب على قاعدة شركة / شركات مختارة
// ------------------------------------------------------------
export async function applyPaymentTemplatesToCompany(companyId) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { dbName: true, provisionedAt: true },
  });
  if (!c?.provisionedAt) throw new AppError("NotProvisioned");
  return applyPaymentTemplates(c.dbName, await getPaymentTemplates());
}

export async function applyPaymentTemplatesToCompanies({ ids }, user) {
  const rows = await prisma.company.findMany({
    where: { id: { in: ids }, provisionedAt: { not: null } },
    orderBy: { serialNo: "asc" },
    select: { id: true, code: true, arName: true, enName: true },
  });
  const results = [];
  for (const c of rows) {
    try {
      await applyPaymentTemplatesToCompany(c.id);
      results.push({ ...c, ok: true });
    } catch (e) {
      results.push({
        ...c,
        error: e instanceof AppError ? e.code : "PaymentTemplatesFailed",
        details:
          e instanceof AppError
            ? e.details
            : { message: e?.message ?? "Unknown" },
      });
    }
  }
  await audit(user, "paymentTemplate.apply", {
    details: {
      companies: results.filter((r) => r.ok).map((r) => r.code),
      failed: results.filter((r) => r.error).map((r) => r.code),
    },
  });
  return { results };
}
