import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { newCompanyCode } from "@/lib/company-code";
import { decryptSecret, encryptSecret, randomPassword } from "@/lib/secret-box";
import {
  appliedMigrations,
  databaseExists,
  databaseStatus,
  dropDatabase,
  migrateDatabase,
  provisionDatabase,
  readMigrations,
  writeSubscription,
  pushCompanyInfo,
} from "@/lib/provision";
import { dayOf, dayToDate, today } from "@/lib/dates";
import { subscriptionState } from "@/lib/subscription";
import { getSettings, vendorPayload } from "./settings.service";
import { audit } from "./audit.service";
import { erpModuleCatalog } from "@/lib/erp-meta";

// ============================================================
// الشركات (العملاء)
// إنشاء الشركة على خطوتين (أو خطوة واحدة لو اختار "إنشاء القاعدة دلوقتي"):
// 1) تسجيل البيانات هنا ← الحالة "pending"
// 2) تجهيز القاعدة كلها (lib/provision.js) من زرار "إنشاء القاعدة" في صفحة الشركة
// لو التجهيز فشل: الشركة بتفضل "pending" والزرار يعيد المحاولة من الأول
// ============================================================

const listSelect = {
  id: true,
  serialNo: true,
  code: true,
  arName: true,
  enName: true,
  status: true,
  startsAt: true,
  endsAt: true,
  graceDays: true,
  readonlyDays: true,
  lastSeenAt: true,
  createdAt: true,
  phone: true,
  contactName: true,
  email: true,
  city: true,
  taxNo: true,
  idType: true,
  idNumber: true,
  district: true,
  street: true,
  buildingNo: true,
  additionalNo: true,
  postalCode: true,
  activityId: true,
  planId: true,
  plan: { select: { id: true, arName: true, enName: true } },
  activity: { select: { id: true, arName: true, enName: true } },
};

// تواريخ ← "YYYY-MM-DD" + حالة الاشتراك المحسوبة
const withState = (c, settings) => ({
  ...c,
  startsAt: dayOf(c.startsAt),
  endsAt: dayOf(c.endsAt),
  sub: subscriptionState(c, settings),
});

export async function getCompanies() {
  const [rows, settings] = await Promise.all([
    prisma.company.findMany({
      orderBy: { serialNo: "desc" },
      select: listSelect,
    }),
    getSettings(),
  ]);
  return rows.map((c) => withState(c, settings));
}

export async function getCompany(id) {
  const [c, settings] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      select: {
        ...listSelect,
        activityId: true,
        planId: true,
        email: true,
        city: true,
        taxNo: true,
        notes: true,
        logo: true,
        suspendReason: true,
        suspendedAt: true,
        dbName: true,
        dbUser: true,
        provisionedAt: true,
        syncedAt: true,
        syncError: true,
        adminUsername: true,
        adminPasswordEnc: true,
        featureOverrides: true,
        moduleOverrides: true,
        activity: {
          select: { id: true, arName: true, enName: true, modules: true },
        },
        maxUsers: true,
        maxBranches: true,
        maxInvoicesMonth: true,
        maxProducts: true,
        updatedAt: true,
        createdBy: { select: { arName: true, enName: true } },
        plan: {
          select: {
            id: true,
            arName: true,
            enName: true,
            maxUsers: true,
            maxBranches: true,
            maxInvoicesMonth: true,
            maxProducts: true,
            features: true,
          },
        },
        history: {
          orderBy: { id: "desc" },
          select: {
            id: true,
            action: true,
            startsAt: true,
            endsAt: true,
            amount: true,
            note: true,
            createdAt: true,
            plan: { select: { arName: true, enName: true } },
            staff: { select: { arName: true, enName: true } },
          },
        },
      },
    }),
    getSettings(),
  ]);
  if (!c) return null;
  const { adminPasswordEnc, ...rest } = c;
  return {
    ...withState(rest, settings),
    // الباسورد نفسه مبيطلعش للمتصفح، بس هل متسجل ولا لأ
    hasAdminPassword: Boolean(adminPasswordEnc),
    history: c.history.map((h) => ({
      ...h,
      startsAt: dayOf(h.startsAt),
      endsAt: dayOf(h.endsAt),
    })),
    settings: {
      graceDays: settings.graceDays,
      readonlyDays: settings.readonlyDays,
    },
  };
}

// كود جديد مش مستخدم قبل كده
async function uniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = newCompanyCode();
    const used = await prisma.company.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!used) return code;
  }
  throw new AppError("UnexpectedError");
}

// الكود واسم القاعدة المقترح (لشاشة شركة جديدة)
export async function suggestCompanyCode() {
  const [code, settings] = await Promise.all([uniqueCode(), getSettings()]);
  return { code, dbName: `${settings.dbPrefix}${code.toLowerCase()}` };
}

// إعادة المحاولة لو رقم العميل اتاخد في نفس اللحظة (عمود فريد)
async function withSerialRetry(fn, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const target = String(e?.meta?.target ?? e?.meta?.modelName ?? "");
      if (e?.code === "P2002" && i < tries && /serial/i.test(target)) continue;
      if (e?.code === "P2002" && i < tries && !target) continue;
      throw e;
    }
  }
}

export async function createCompany(data, user) {
  const settings = await getSettings();
  const code =
    data.code && /^[A-Z2-9]{8}$/.test(data.code)
      ? data.code
      : await uniqueCode();
  if (
    await prisma.company.findUnique({ where: { code }, select: { id: true } })
  ) {
    throw new AppError("CodeTaken");
  }
  const dbName = data.dbName ?? `${settings.dbPrefix}${code.toLowerCase()}`;
  if (
    await prisma.company.findUnique({ where: { dbName }, select: { id: true } })
  ) {
    throw new AppError("DbNameTaken", null, { dbName: "DbNameTaken" });
  }
  const dbUser = (data.dbUser ?? dbName).slice(0, 32);
  if (
    await prisma.company.findFirst({ where: { dbUser }, select: { id: true } })
  ) {
    throw new AppError("DbUserTaken", null, { dbUser: "DbUserTaken" });
  }
  // قبل ما نسجّل حاجة: ملفات الجداول موجودة، والاسم مش مستخدم على السيرفر
  if (data.provisionNow) readMigrations();
  if (await databaseExists(dbName)) {
    throw new AppError("DbExists", null, { dbName: "DbExists" });
  }
  if (data.planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: data.planId },
      select: { isActive: true },
    });
    if (!plan?.isActive)
      throw new AppError("PlanNotFound", null, { planId: "PlanNotFound" });
  }

  // رقم العميل الجديد = أكبر رقم + 1 (لو اتنين اتعملوا في نفس اللحظة: نعيد المحاولة)
  const company = await withSerialRetry(() =>
    prisma.$transaction(async (tx) => {
      const last = await tx.company.aggregate({ _max: { serialNo: true } });
      const serialNo = (last._max.serialNo ?? 0) + 1;
      const created = await tx.company.create({
        data: {
          serialNo,
          code,
          arName: data.arName,
          enName: data.enName,
          activityId: data.activityId ?? null,
          contactName: data.contactName,
          phone: data.phone,
          email: data.email,
          city: data.city,
          taxNo: data.taxNo,
          idType: data.idType,
          idNumber: data.idNumber,
          district: data.district,
          street: data.street,
          buildingNo: data.buildingNo,
          additionalNo: data.additionalNo,
          postalCode: data.postalCode,
          notes: data.notes,
          planId: data.planId ?? null,
          maxUsers: data.maxUsers,
          maxBranches: data.maxBranches,
          maxInvoicesMonth: data.maxInvoicesMonth,
          maxProducts: data.maxProducts,
          graceDays: data.graceDays,
          readonlyDays: data.readonlyDays,
          startsAt: dayToDate(data.startsAt),
          endsAt: dayToDate(data.endsAt),
          status: "pending",
          dbName,
          dbUser,
          dbPasswordEnc: encryptSecret(data.dbPassword ?? randomPassword(24)),
          adminUsername: data.adminUsername,
          adminPasswordEnc: encryptSecret(data.adminPassword),
          createdById: user.id,
        },
        select: { id: true, code: true, serialNo: true },
      });
      await tx.subscriptionHistory.create({
        data: {
          companyId: created.id,
          action: "create",
          planId: data.planId ?? null,
          startsAt: dayToDate(data.startsAt),
          endsAt: dayToDate(data.endsAt),
          amount: data.amount ?? null,
          staffId: user.id,
        },
      });
      await audit(user, "company.create", {
        companyId: created.id,
        details: { code, name: data.arName, dbName },
        db: tx,
      });
      return created;
    }),
  );

  // تجهيز القاعدة والجداول ومدير الشركة (لو اختار دلوقتي)
  if (!data.provisionNow)
    return { ...company, provisioned: false, skipped: true };
  try {
    const r = await provisionCompany(company.id, user);
    return { ...company, provisioned: true, ...r };
  } catch (e) {
    return {
      ...company,
      provisioned: false,
      error: e instanceof AppError ? e.code : "ProvisionFailed",
      details:
        e instanceof AppError
          ? e.details
          : { message: e?.message ?? "Unknown" },
    };
  }
}

// ------------------------------------------------------------
// تجهيز قاعدة الشركة (أول مرة، أو إعادة محاولة بعد فشل)
// ------------------------------------------------------------
const busy = new Set();

async function withLock(id, fn) {
  if (busy.has(id)) throw new AppError("ProvisionBusy");
  busy.add(id);
  try {
    return await fn();
  } finally {
    busy.delete(id);
  }
}

export async function provisionCompany(id, user, newAdminPassword = null) {
  return withLock(id, async () => {
    const c = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        arName: true,
        enName: true,
        phone: true,
        email: true,
        city: true,
        taxNo: true,
        idType: true,
        idNumber: true,
        district: true,
        street: true,
        buildingNo: true,
        additionalNo: true,
        postalCode: true,
        dbName: true,
        dbUser: true,
        dbPasswordEnc: true,
        adminUsername: true,
        adminPasswordEnc: true,
        provisionedAt: true,
      },
    });
    if (!c) throw new AppError("NotFound");
    if (c.provisionedAt) throw new AppError("AlreadyProvisioned");

    let result;
    try {
      result = await provisionDatabase(
        {
          ...c,
          dbPassword: decryptSecret(c.dbPasswordEnc),
        },
        newAdminPassword ??
          (c.adminPasswordEnc ? decryptSecret(c.adminPasswordEnc) : null),
        { fresh: true },
      );
    } catch (e) {
      await audit(user, "company.provisionFailed", {
        companyId: id,
        details: {
          error: e instanceof AppError ? e.code : "ProvisionFailed",
          ...(e?.details ?? {}),
        },
      });
      throw e;
    }

    await prisma.company.update({
      where: { id },
      data: {
        provisionedAt: new Date(),
        status: c.status === "pending" ? "active" : c.status,
        // الباسورد المؤقت مبقاش له لازمة (اتحفظ hash جوه قاعدة الشركة)
        adminPasswordEnc: null,
      },
    });
    await audit(user, "company.provision", {
      companyId: id,
      details: { dbName: c.dbName, migrations: result.total },
    });
    // نسخة الاشتراك جوه القاعدة الجديدة
    const sync = await trySync(id);
    // الأدوار الثابتة (قوالب الأدوار) بتنزل في القاعدة الجديدة
    let templates = null;
    try {
      const { applyTemplatesToCompany } =
        await import("./role-template.service");
      templates = await applyTemplatesToCompany(id);
    } catch (e) {
      templates = { error: e instanceof AppError ? e.code : "TemplatesFailed" };
      console.error("[provision] role templates:", e?.message ?? e);
    }
    // طرق الدفع الثابتة (قوالب طرق الدفع) بتنزل كمان
    let paymentTemplates = null;
    try {
      const { applyPaymentTemplatesToCompany } =
        await import("./payment-template.service");
      paymentTemplates = await applyPaymentTemplatesToCompany(id);
    } catch (e) {
      paymentTemplates = {
        error: e instanceof AppError ? e.code : "PaymentTemplatesFailed",
      };
      console.error("[provision] payment templates:", e?.message ?? e);
    }
    return { ...result, ...sync, templates, paymentTemplates };
  });
}

// مستخدم MySQL بتاع الشركة (بيتصلح مع تحديث الجداول لو ناقص)
const dbAccount = (c) => ({
  dbUser: c.dbUser,
  dbPassword: decryptSecret(c.dbPasswordEnc),
});

// ------------------------------------------------------------
// تحديث الجداول (بعد أي تحديث للبرنامج الأساسي فيه migrations جديدة)
// ------------------------------------------------------------
export async function migrateCompany(id, user) {
  return withLock(id, async () => {
    const c = await prisma.company.findUnique({
      where: { id },
      select: {
        dbName: true,
        dbUser: true,
        dbPasswordEnc: true,
        provisionedAt: true,
      },
    });
    if (!c) throw new AppError("NotFound");
    if (!c.provisionedAt) throw new AppError("NotProvisioned");
    const r = await migrateDatabase(c.dbName, undefined, dbAccount(c));
    if (r.applied)
      await audit(user, "company.migrate", {
        companyId: id,
        details: { applied: r.applied },
      });
    // ممكن التحديث يكون عمل جداول الاشتراك لأول مرة
    return { ...r, ...(await trySync(id)) };
  });
}

// ------------------------------------------------------------
// شاشة "تحديث القواعد": كل التحديثات + حالة قاعدة كل شركة
// ------------------------------------------------------------
export async function getUpdatesOverview() {
  const migrations = readMigrations().map((m) => m.name);
  const rows = await prisma.company.findMany({
    where: { provisionedAt: { not: null } },
    orderBy: { serialNo: "asc" },
    select: {
      id: true,
      serialNo: true,
      code: true,
      arName: true,
      enName: true,
      status: true,
      dbName: true,
    },
  });
  const companies = await Promise.all(
    rows.map(async ({ dbName, ...c }) => {
      const st = await appliedMigrations(dbName);
      if (!st.ok) return { ...c, ok: false, error: st.error };
      const done = new Set(st.applied);
      return {
        ...c,
        ok: true,
        failed: st.failed,
        pending: migrations.filter((m) => !done.has(m)),
        // آخر تحديث مطبّق (حسب الترتيب)
        last: [...migrations].reverse().find((m) => done.has(m)) ?? null,
      };
    }),
  );
  return { migrations, companies };
}

// ------------------------------------------------------------
// تحديث شركات مختارة لحد تحديث معيّن (upTo)
// التحديثات بتتطبق بالترتيب: مينفعش تتخطى تحديث وتطبّق اللي بعده
// ------------------------------------------------------------
export async function migrateCompanies({ ids, upTo }, user) {
  const all = readMigrations();
  let migrations = all;
  if (upTo) {
    const idx = all.findIndex((m) => m.name === upTo);
    if (idx < 0) throw new AppError("MigrationNotFound");
    migrations = all.slice(0, idx + 1);
  }
  const rows = await prisma.company.findMany({
    where: { id: { in: ids }, provisionedAt: { not: null } },
    orderBy: { serialNo: "asc" },
    select: {
      id: true,
      code: true,
      arName: true,
      enName: true,
      dbName: true,
      dbUser: true,
      dbPasswordEnc: true,
    },
  });
  const results = [];
  for (const c of rows) {
    try {
      const r = await withLock(c.id, () =>
        migrateDatabase(c.dbName, migrations, dbAccount(c)),
      );
      results.push({
        id: c.id,
        code: c.code,
        arName: c.arName,
        enName: c.enName,
        applied: r.applied,
      });
      await trySync(c.id);
      if (r.applied)
        await audit(user, "company.migrate", {
          companyId: c.id,
          details: { applied: r.applied, upTo: upTo ?? null },
        });
    } catch (e) {
      results.push({
        id: c.id,
        code: c.code,
        arName: c.arName,
        enName: c.enName,
        error: e instanceof AppError ? e.code : "ProvisionFailed",
        details:
          e instanceof AppError
            ? e.details
            : { message: e?.message ?? "Unknown" },
      });
    }
  }
  return {
    results,
    applied: results.reduce((sum, r) => sum + (r.applied ?? 0), 0),
  };
}

// ------------------------------------------------------------
// حذف قاعدة الشركة (لازم يكتب كود الشركة للتأكيد)
// الشركة نفسها بتفضل، وترجع "pending" لو كانت نشطة، وتقدر تعمل لها قاعدة جديدة
// ------------------------------------------------------------
export async function deleteCompanyDb({ id, confirm }, user) {
  return withLock(id, async () => {
    const c = await prisma.company.findUnique({
      where: { id },
      select: { code: true, status: true, dbName: true, dbUser: true },
    });
    if (!c) throw new AppError("NotFound");
    if (
      String(confirm ?? "")
        .trim()
        .toUpperCase() !== c.code
    )
      throw new AppError("ConfirmCodeWrong", null, {
        confirm: "ConfirmCodeWrong",
      });
    await dropDatabase(c.dbName, c.dbUser);
    await prisma.company.update({
      where: { id },
      data: {
        provisionedAt: null,
        status: c.status === "active" ? "pending" : c.status,
      },
    });
    await audit(user, "company.dropDb", {
      companyId: id,
      details: { dbName: c.dbName },
    });
    return { id };
  });
}

// ------------------------------------------------------------
// حذف الشركة نهائياً من اللوحة (للتجارب أو اللي اتعملت بالغلط)
// لازم قاعدتها تكون اتحذفت الأول
// ------------------------------------------------------------
export async function deleteCompany({ id, confirm }, user) {
  return withLock(id, async () => {
    const c = await prisma.company.findUnique({
      where: { id },
      select: {
        code: true,
        arName: true,
        dbName: true,
        provisionedAt: true,
      },
    });
    if (!c) throw new AppError("NotFound");
    if (
      String(confirm ?? "")
        .trim()
        .toUpperCase() !== c.code
    )
      throw new AppError("ConfirmCodeWrong", null, {
        confirm: "ConfirmCodeWrong",
      });
    if (c.provisionedAt) throw new AppError("DropDbFirst");
    // لو فيه قاعدة فاضلة من محاولة فاشلة
    if (await databaseExists(c.dbName)) throw new AppError("DropDbFirst");
    await prisma.company.delete({ where: { id } });
    await audit(user, "company.delete", {
      details: { code: c.code, name: c.arName, dbName: c.dbName },
    });
    return { id };
  });
}

// ============================================================
// مزامنة الاشتراك مع قاعدة الشركة
// اللوحة هي الأصل: أي تعديل هنا بيتكتب في جدول subscription جوه قاعدة الشركة
// (البرنامج الأساسي بيقرا منه بس، من غير ما يسأل اللوحة)
// ============================================================
// DATETIME بتوقيت UTC (زي ما Prisma بيقرا في البرنامج الأساسي)
const utc = (d) =>
  d ? new Date(d).toISOString().replace("T", " ").slice(0, 23) : null;

export async function syncCompany(id) {
  const [c, settings] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      select: {
        code: true,
        serialNo: true,
        status: true,
        suspendReason: true,
        dbName: true,
        provisionedAt: true,
        featureOverrides: true,
        moduleOverrides: true,
        activity: { select: { modules: true, staffTitle: true } },
        maxUsers: true,
        maxBranches: true,
        maxInvoicesMonth: true,
        maxProducts: true,
        startsAt: true,
        endsAt: true,
        graceDays: true,
        readonlyDays: true,
        plan: {
          select: {
            arName: true,
            enName: true,
            features: true,
            maxUsers: true,
            maxBranches: true,
            maxInvoicesMonth: true,
            maxProducts: true,
          },
        },
        history: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            action: true,
            startsAt: true,
            endsAt: true,
            amount: true,
            note: true,
            createdAt: true,
            plan: { select: { arName: true, enName: true } },
          },
        },
      },
    }),
    getSettings(),
  ]);
  if (!c?.provisionedAt) return { skipped: true };
  const pick = (own, fromPlan) => own ?? fromPlan ?? null;
  const sub = {
    companyCode: c.code,
    companySerial: c.serialNo,
    status: c.status,
    suspendReason: c.suspendReason ?? null,
    planArName: c.plan?.arName ?? null,
    planEnName: c.plan?.enName ?? null,
    // مميزات الباقة + استثناءات الشركة دي
    features: await effectiveFeatures(c.plan, c.featureOverrides),
    // وحدات النشاط + استثناءات الشركة
    modules: effectiveModules(c.activity, c.moduleOverrides),
    // اسم مقدم الخدمة (ثابت للنشاط)
    staffTitle: c.activity?.staffTitle ?? null,
    // حدود الشركة لو متحددة، وإلا حدود الباقة
    maxUsers: pick(c.maxUsers, c.plan?.maxUsers),
    maxBranches: pick(c.maxBranches, c.plan?.maxBranches),
    maxInvoicesMonth: pick(c.maxInvoicesMonth, c.plan?.maxInvoicesMonth),
    maxProducts: pick(c.maxProducts, c.plan?.maxProducts),
    startsAt: dayOf(c.startsAt),
    endsAt: dayOf(c.endsAt),
    graceDays: c.graceDays ?? settings.graceDays,
    readonlyDays: c.readonlyDays ?? settings.readonlyDays,
    expiringDays: settings.expiringDays,
    // بيانات الدعم الفني (بتظهر عند العميل)
    vendor: vendorPayload(settings),
  };
  const logs = c.history.map((h) => ({
    id: h.id,
    action: h.action,
    planArName: h.plan?.arName ?? null,
    planEnName: h.plan?.enName ?? null,
    startsAt: dayOf(h.startsAt),
    endsAt: dayOf(h.endsAt),
    amount: h.amount ?? null,
    note: h.note ?? null,
    createdAt: utc(h.createdAt),
  }));
  await writeSubscription(c.dbName, sub, logs);
  return { synced: true };
}

// ------------------------------------------------------------
// المميزات الفعلية للشركة = مميزات الباقة + استثناءات الشركة
// - null = كل حاجة مفتوحة (من غير باقة ومن غير استثناءات "مقفولة")
// ------------------------------------------------------------
export async function effectiveFeatures(plan, overrides) {
  const o =
    overrides && typeof overrides === "object" && !Array.isArray(overrides)
      ? overrides
      : {};
  const hasOff = Object.values(o).includes("off");
  const planHas = plan && Array.isArray(plan.features);
  if (!planHas && !hasOff) return null;
  const { getPlanFeatures } = await import("./plan.service");
  const all = (await getPlanFeatures()).map((f) => f.key);
  // من غير باقة: كله مفتوح ما عدا المقفول
  const base = new Set(planHas ? plan.features : all);
  for (const [k, v] of Object.entries(o)) {
    if (v === "on") base.add(k);
    if (v === "off") base.delete(k);
  }
  return all.filter((k) => base.has(k));
}

// حفظ استثناءات المميزات لشركة ← بتنزل عندها على طول
// وحدات النشاط الفعلية: وحدات النشاط ± استثناءات الشركة (مصفوفة دايمًا)
export function effectiveModules(activity, overrides) {
  const o = asOverrides(overrides);
  const base = new Set(
    Array.isArray(activity?.modules) ? activity.modules : [],
  );
  for (const [k, v] of Object.entries(o)) {
    if (v === "on") base.add(k);
    if (v === "off") base.delete(k);
  }
  return [...base];
}

const asOverrides = (o) =>
  o && typeof o === "object" && !Array.isArray(o) ? o : {};

export async function setCompanyFeatures(
  { id, overrides, moduleOverrides },
  user,
) {
  const c = await prisma.company.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!c) throw new AppError("NotFound");
  const { getPlanFeatures } = await import("./plan.service");
  const known = new Set((await getPlanFeatures()).map((f) => f.key));
  const clean = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([k]) => known.has(k)),
  );
  const knownModules = new Set(
    (await erpModuleCatalog().catch(() => [])).map((m) => m.key),
  );
  const cleanMods = Object.fromEntries(
    Object.entries(moduleOverrides ?? {}).filter(([k]) => knownModules.has(k)),
  );
  await prisma.company.update({
    where: { id },
    data: {
      featureOverrides: Object.keys(clean).length ? clean : null,
      // الكتالوج مش متاح: منلمسش الاستثناءات المحفوظة
      ...(knownModules.size
        ? { moduleOverrides: Object.keys(cleanMods).length ? cleanMods : null }
        : {}),
    },
  });
  await audit(user, "company.features", {
    companyId: id,
    details: { ...clean, modules: cleanMods },
  });
  return { id, ...(await trySync(id)) };
}

// مزامنة من غير ما ترمي خطأ: بتسجّل النتيجة في الشركة (syncedAt / syncError)
export async function trySync(id) {
  try {
    const r = await syncCompany(id);
    if (r.skipped) return { synced: false, skipped: true };
    await prisma.company.update({
      where: { id },
      data: { syncedAt: new Date(), syncError: null },
    });
    return { synced: true };
  } catch (e) {
    const code = e instanceof AppError ? e.code : "SyncFailed";
    const msg = e?.details?.message ?? null;
    await prisma.company
      .update({
        where: { id },
        data: { syncError: msg ? `${code}: ${msg}` : code },
      })
      .catch(() => {});
    return {
      synced: false,
      syncError: code,
      syncDetails: e instanceof AppError ? e.details : { message: msg },
    };
  }
}

// زرار "مزامنة" في صفحة الشركة
export async function syncCompanyNow(id, user) {
  const r = await trySync(id);
  if (r.skipped) throw new AppError("NotProvisioned");
  if (!r.synced)
    throw new AppError(r.syncError, r.syncDetails ?? { message: "Unknown" });
  await audit(user, "company.sync", { companyId: id });
  return r;
}

// كل الشركات اللي قاعدتها جاهزة (بعد تغيير الإعدادات الافتراضية مثلاً)
export async function syncAllCompanies() {
  const rows = await prisma.company.findMany({
    where: { provisionedAt: { not: null } },
    select: { id: true },
  });
  let failed = 0;
  for (const r of rows) if (!(await trySync(r.id)).synced) failed++;
  return { total: rows.length, failed };
}

// حالة القاعدة لصفحة التفاصيل
export async function getCompanyDbStatus(company) {
  if (!company.provisionedAt) return null;
  return databaseStatus(company.dbName);
}

export async function updateCompany({ id, ...data }, user) {
  const exists = await prisma.company.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new AppError("NotFound");
  await prisma.company.update({
    where: { id },
    data: { ...data, activityId: data.activityId ?? null },
  });
  await audit(user, "company.update", {
    companyId: id,
    details: { name: data.arName },
  });
  // بيانات الشركة تنزل كمان في «بيانات الشركة» جوه البرنامج
  // (الخانة الفاضية هنا مش بتمسح اللي متسجل هناك)
  let infoSynced = null;
  const c = await prisma.company.findUnique({
    where: { id },
    select: { dbName: true, provisionedAt: true },
  });
  if (c?.provisionedAt) {
    try {
      infoSynced = await pushCompanyInfo(c.dbName, data);
    } catch (e) {
      infoSynced = false;
      console.error("[company] push info:", e?.message ?? e);
    }
  }
  return { id, infoSynced, ...(await trySync(id)) };
}

// تجديد / تمديد: تاريخ نهاية جديد
export async function renewCompany({ id, endsAt, amount, note }, user) {
  const c = await prisma.company.findUnique({
    where: { id },
    select: { endsAt: true, planId: true, status: true },
  });
  if (!c) throw new AppError("NotFound");
  if (c.status === "cancelled") throw new AppError("CompanyCancelled");
  const oldEnd = dayOf(c.endsAt);
  if (endsAt <= today() && endsAt <= oldEnd) {
    throw new AppError("RenewDateInvalid", null, {
      endsAt: "RenewDateInvalid",
    });
  }
  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id },
      data: { endsAt: dayToDate(endsAt) },
    });
    await tx.subscriptionHistory.create({
      data: {
        companyId: id,
        action: "renew",
        planId: c.planId,
        startsAt: dayToDate(oldEnd),
        endsAt: dayToDate(endsAt),
        amount: amount ?? null,
        note,
        staffId: user.id,
      },
    });
    await audit(user, "company.renew", {
      companyId: id,
      details: { from: oldEnd, to: endsAt, amount: amount ?? null },
      db: tx,
    });
  });
  return { id, ...(await trySync(id)) };
}

export async function changePlan({ id, planId, note }, user) {
  const c = await prisma.company.findUnique({
    where: { id },
    select: { planId: true },
  });
  if (!c) throw new AppError("NotFound");
  if (planId) {
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { isActive: true },
    });
    if (!plan?.isActive) throw new AppError("PlanNotFound");
  }
  await prisma.$transaction(async (tx) => {
    await tx.company.update({ where: { id }, data: { planId } });
    await tx.subscriptionHistory.create({
      data: { companyId: id, action: "plan", planId, note, staffId: user.id },
    });
    await audit(user, "company.plan", {
      companyId: id,
      details: { from: c.planId, to: planId },
      db: tx,
    });
  });
  return { id, ...(await trySync(id)) };
}

// إيقاف / تفعيل / إلغاء
export async function setCompanyStatus({ id, action, reason }, user) {
  const c = await prisma.company.findUnique({
    where: { id },
    select: {
      status: true,
      provisionedAt: true,
      planId: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!c) throw new AppError("NotFound");
  if (c.status === "cancelled" && action !== "activate")
    throw new AppError("CompanyCancelled");
  // التفعيل: نشط لو القاعدة اتعملت، وإلا يرجع "pending"
  const status =
    action === "suspend"
      ? "suspended"
      : action === "cancel"
        ? "cancelled"
        : c.provisionedAt
          ? "active"
          : "pending";
  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id },
      data: {
        status,
        suspendReason: action === "activate" ? null : reason,
        suspendedAt: action === "activate" ? null : new Date(),
      },
    });
    await tx.subscriptionHistory.create({
      // نسجّل الباقة ومدة الاشتراك وقت العملية (عشان تظهر في السجل)
      data: {
        companyId: id,
        action,
        planId: c.planId,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        note: reason,
        staffId: user.id,
      },
    });
    await audit(user, `company.${action}`, {
      companyId: id,
      details: { reason },
      db: tx,
    });
  });
  return { id, status, ...(await trySync(id)) };
}
