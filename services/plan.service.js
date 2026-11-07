import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { audit } from "./audit.service";
import { erpPlanCatalog } from "@/lib/erp-meta";
import { PLAN_FEATURES } from "@/lib/plan-features";

// المميزات المعروفة بس (من كتالوج البرنامج الأساسي)
async function cleanFeatures(list) {
  const catalog = await erpPlanCatalog().catch(() => null);
  const known = new Set(catalog ? catalog.map((f) => f.key) : PLAN_FEATURES);
  return [...new Set(list ?? [])].filter((f) => known.has(f));
}

// القايمة لشاشة الباقات
export async function getPlanFeatures() {
  const catalog = await erpPlanCatalog().catch(() => null);
  return catalog ?? PLAN_FEATURES.map((key) => ({ key, ar: null, en: null }));
}

// أي تعديل في الباقة بينزل لكل الشركات اللي عليها (نسخة الاشتراك عندهم)
async function syncPlanCompanies(planId) {
  const { trySync } = await import("./company.service");
  const rows = await prisma.company.findMany({
    where: { planId, provisionedAt: { not: null } },
    select: { id: true },
  });
  let failed = 0;
  for (const r of rows) if (!(await trySync(r.id)).synced) failed++;
  return { companies: rows.length, failed };
}

export const getPlans = () =>
  prisma.plan.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { companies: true } } },
  });

export const getActivePlans = () =>
  prisma.plan.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });

export async function createPlan(data, user) {
  data = { ...data, features: await cleanFeatures(data.features) };
  const plan = await prisma.plan.create({ data, select: { id: true } });
  await audit(user, "plan.create", { details: { name: data.arName } });
  return plan;
}

export async function updatePlan({ id, ...data }, user) {
  data = { ...data, features: await cleanFeatures(data.features) };
  await prisma.plan.update({ where: { id }, data });
  await audit(user, "plan.update", { details: { name: data.arName } });
  // ينزل للشركات اللي على الباقة دي
  const sync = await syncPlanCompanies(id);
  return { id, ...sync };
}

export async function deletePlan(id, user) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: { arName: true, _count: { select: { companies: true } } },
  });
  if (!plan) throw new AppError("NotFound");
  if (plan._count.companies > 0) throw new AppError("PlanInUse");
  await prisma.plan.delete({ where: { id } });
  await audit(user, "plan.delete", { details: { name: plan.arName } });
  return { id };
}
