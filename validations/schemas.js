import { z } from "zod";
import {
  dayField,
  idField,
  optionalLimit,
  optionalText,
  passwordField,
  requiredText,
  usernameField,
} from "./common";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { DB_NAME_RE } from "@/lib/company-code";

// ---------- الدخول والإعداد الأول ----------
export const loginSchema = z.object({
  username: requiredText(50),
  password: z.string({ error: "RequiredField" }).min(1, "RequiredField"),
});

export const setupSchema = z.object({
  username: usernameField,
  arName: requiredText(100),
  enName: requiredText(100),
  password: passwordField,
});

// ---------- الموظفين والأدوار ----------
const staffFields = {
  username: usernameField,
  arName: requiredText(100),
  enName: requiredText(100),
  phone: optionalText(30),
  email: optionalText(150),
  roleId: idField.nullish(),
  isActive: z.boolean().default(true),
};
export const createStaffSchema = z.object({
  ...staffFields,
  password: passwordField,
});
export const updateStaffSchema = z.object({
  ...staffFields,
  id: idField,
  // فاضي = زي ما هو
  password: z.preprocess(
    (v) => (v === "" ? undefined : v),
    passwordField.optional(),
  ),
});

const roleFields = {
  arName: requiredText(80),
  enName: requiredText(80),
  permissions: z.array(z.enum(ALL_PERMISSIONS)).default([]),
  isActive: z.boolean().default(true),
};
export const createRoleSchema = z.object(roleFields);
export const updateRoleSchema = z.object({ ...roleFields, id: idField });

// ---------- الباقات والأنشطة ----------
const planFields = {
  arName: requiredText(80),
  enName: requiredText(80),
  price: z
    .number({ error: "RequiredField" })
    .min(0, "MustBePositive")
    .max(10_000_000),
  period: z.enum(["month", "year"]).default("year"),
  maxUsers: optionalLimit,
  maxBranches: optionalLimit,
  maxInvoicesMonth: optionalLimit,
  maxProducts: optionalLimit,
  // مفاتيح المميزات (بتتراجع على كتالوج البرنامج الأساسي في الـ service)
  features: z.array(z.string().max(40)).max(60).default([]),
  notes: optionalText(500),
  isActive: z.boolean().default(true),
};
export const createPlanSchema = z.object(planFields);
export const updatePlanSchema = z.object({ ...planFields, id: idField });

// صورة مرفوعة (اختيارية): الحجم والنوع بيتراجعوا تاني في lib/upload.js
const imageField = z
  .custom(
    (v) => v === null || (typeof File !== "undefined" && v instanceof File),
  )
  .nullable()
  .default(null);

const activityFields = {
  arName: requiredText(80),
  enName: requiredText(80),
  isActive: z.boolean().default(true),
  // وحدات النشاط في البرنامج الأساسي
  modules: z.array(z.string().max(40)).max(100).default([]),
  // اسم مقدم الخدمة (فني / عاملة / حلاق / معالج) - null = فني
  staffTitle: z
    .enum(["technician", "staff", "barber", "therapist"])
    .nullable()
    .default(null),
  // صورة شاشة الدخول للنشاط
  image: imageField,
  removeImage: z.boolean().default(false),
};
export const createActivitySchema = z.object(activityFields);
export const updateActivitySchema = z.object({
  ...activityFields,
  id: idField,
});

// ---------- الشركات ----------
// أرقام بطول ثابت (فاضي = مش مكتوب)
const optionalDigits = (len, msg) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z
      .string()
      .trim()
      .regex(new RegExp(`^\\d{${len}}$`), msg)
      .nullish(),
  );

const companyInfo = {
  arName: requiredText(150),
  enName: requiredText(150),
  activityId: idField.nullish(),
  contactName: optionalText(100),
  phone: optionalText(30),
  email: optionalText(150),
  city: optionalText(80),
  taxNo: optionalText(20),
  // رقم المنشأة (اختياري)
  idType: z.enum(["CRN", "700", "NAT", "IQA", "OTH"]).nullish(),
  idNumber: optionalText(30),
  // العنوان الوطني (اختياري)
  district: optionalText(100),
  street: optionalText(100),
  buildingNo: optionalDigits(4, "BuildingNoInvalid"),
  additionalNo: optionalDigits(4, "AdditionalNoInvalid"),
  postalCode: optionalDigits(5, "PostalCodeInvalid"),
  notes: optionalText(2000),
};
const limits = {
  maxUsers: optionalLimit,
  maxBranches: optionalLimit,
  maxInvoicesMonth: optionalLimit,
  maxProducts: optionalLimit,
  graceDays: optionalLimit,
  readonlyDays: optionalLimit,
};

export const createCompanySchema = z
  .object({
    ...companyInfo,
    ...limits,
    planId: idField.nullish(),
    startsAt: dayField,
    endsAt: dayField,
    // الكود اللي ظهر في الشاشة (مقترح من السيرفر)، أو فاضي = جديد
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z2-9]{8}$/)
      .optional(),
    adminUsername: usernameField,
    adminPassword: passwordField,
    // فاضي = الاسم المقترح (بادئة + الكود)
    dbName: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .toLowerCase()
        .regex(DB_NAME_RE, "DbNameInvalid")
        .optional(),
    ),
    // إعدادات متقدمة: فاضي = أوتوماتيك
    dbUser: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_]{3,32}$/, "DbUserInvalid")
        .optional(),
    ),
    dbPassword: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.string().min(12, "DbPasswordMin").max(100).optional(),
    ),
    // مبلغ الاشتراك الأول (بيتسجل في سجل الاشتراك)
    amount: z.number().min(0).max(10_000_000).nullish(),
    // true = تجهيز القاعدة فوراً، false = تتسجل بس ("pending") والقاعدة بعدين
    provisionNow: z.boolean().optional().default(false),
  })
  .refine((d) => d.endsAt >= d.startsAt, {
    message: "EndBeforeStart",
    path: ["endsAt"],
  });

export const updateCompanySchema = z.object({
  ...companyInfo,
  ...limits,
  id: idField,
});

export const renewSchema = z.object({
  id: idField,
  endsAt: dayField,
  amount: z.number().min(0).max(10_000_000).nullish(),
  note: optionalText(500),
});

export const changePlanSchema = z.object({
  id: idField,
  planId: idField.nullable(),
  note: optionalText(500),
});

export const statusSchema = z.object({
  id: idField,
  // suspend | activate | cancel
  action: z.enum(["suspend", "activate", "cancel"]),
  reason: optionalText(255),
});

// ---------- الإعدادات ----------
export const settingsSchema = z.object({
  graceDays: z.number().int().min(0).max(365),
  readonlyDays: z.number().int().min(0).max(365),
  expiringDays: z.number().int().min(1).max(90),
  dbPrefix: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_]{0,15}$/, "DbPrefixInvalid"),
});

export const idSchema = z.object({ id: idField });

// تحديث قواعد شركات مختارة لحد تحديث معيّن (فاضي = لحد آخر تحديث)
export const migrateSelectedSchema = z.object({
  ids: z.array(idField).min(1, "SelectCompanies").max(1000),
  upTo: z
    .string()
    .regex(/^[A-Za-z0-9_]{1,255}$/)
    .nullable()
    .optional(),
});

// العمليات الخطيرة: لازم يكتب كود الشركة
export const dangerSchema = z.object({
  id: idField,
  confirm: z.string().trim().min(1, "RequiredField").max(16),
});

// إنشاء القاعدة: باسورد مدير جديد (لو القديم مش متسجل)
export const provisionSchema = z.object({
  id: idField,
  adminPassword: passwordField.optional(),
});

// تفعيل / إيقاف نشاط من الجدول
export const activityActiveSchema = z.object({
  id: idField,
  isActive: z.boolean(),
});

// بيانات الشركة المالكة (الدعم الفني)
export const vendorSchema = z.object({
  vendorArName: optionalText(150),
  vendorEnName: optionalText(150),
  vendorPhone: optionalText(30),
  vendorPhone2: optionalText(30),
  // واتساب: أرقام بس مع كود الدولة (مثلاً 966500000000)
  vendorWhatsapp: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/[^\d]/g, "") || null : v),
    z
      .string()
      .regex(/^\d{8,15}$/, "WhatsappInvalid")
      .nullish(),
  ),
  vendorEmail: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().email("EmailInvalid").max(150).nullish(),
  ),
  vendorWebsite: optionalText(200),
  vendorAddressAr: optionalText(300),
  vendorAddressEn: optionalText(300),
  vendorHoursAr: optionalText(200),
  vendorHoursEn: optionalText(200),
  logo: imageField,
  removeLogo: z.boolean().default(false),
});

// ---------- قوالب الأدوار ----------
const roleTemplateFields = {
  arName: requiredText(50),
  enName: requiredText(50),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string().max(100)).max(500).default([]),
};
export const createRoleTemplateSchema = z.object(roleTemplateFields);
export const updateRoleTemplateSchema = z.object({
  ...roleTemplateFields,
  id: idField,
});
export const importRolesSchema = z.object({
  dbName: z.string().trim().min(1, "RequiredField").max(64),
});
// mode: keep ← الأدوار المتعدّلة للشركة متتلمسش (الافتراضي) | all ← كله زي القالب
export const applyTemplatesSchema = z.object({
  ids: z.array(idField).min(1, "SelectCompanies").max(1000),
  mode: z.enum(["keep", "all"]).default("keep"),
});
// حالة القوالب عند الشركات (قبل التطبيق)
export const templateStatusSchema = z.object({
  ids: z.array(idField).max(1000),
});
// «رجّع للقالب»: دور واحد عند شركة واحدة
export const resetTemplateRoleSchema = z.object({
  companyId: idField,
  templateId: idField,
});

// ---------- قوالب طرق الدفع ----------
const paymentTemplateFields = {
  arName: requiredText(50),
  enName: requiredText(50),
  type: z.enum(
    ["cash", "card", "wallet", "transfer", "credit"],
    "RequiredField",
  ),
  requiresReference: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
};
export const createPaymentTemplateSchema = z.object(paymentTemplateFields);
export const updatePaymentTemplateSchema = z.object({
  ...paymentTemplateFields,
  id: idField,
});

// ---------- النسخ الاحتياطي من اللوحة ----------
export const backupCompaniesSchema = z.object({
  ids: z.array(idField).min(1, "SelectCompanies").max(1000),
});
// code: كود الشركة، أو _panel (نسخ قاعدة اللوحة)
const backupCode = z.string().regex(/^([A-Z2-9]{8}|_panel)$/);
const backupName = z.string().regex(/^[\w.-]+\.sql$/);
export const deleteBackupSchema = z.object({
  code: backupCode,
  name: backupName,
});
// الاسترجاع: لازم يكتب كود الشركة (أو PANEL للوحة) للتأكيد
export const restoreCompanySchema = z.object({
  id: idField,
  name: backupName,
  confirm: z.string().trim().max(20),
});
export const restorePanelSchema = z.object({
  name: backupName,
  confirm: z.string().trim().max(20),
});
export const panelBackupScheduleSchema = z.object({
  panelBackupEnabled: z.boolean(),
  panelBackupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "InvalidTime"),
  panelBackupKeep: z.number().int().min(1).max(365),
});

// استثناءات المميزات لشركة: { key: "on" | "off" } (المش موجود = حسب الباقة)
export const companyFeaturesSchema = z.object({
  id: idField,
  overrides: z.record(z.string().max(40), z.enum(["on", "off"])).default({}),
  // استثناءات وحدات النشاط
  moduleOverrides: z
    .record(z.string().max(40), z.enum(["on", "off"]))
    .default({}),
});

// ---------- تطبيقات التوصيل ----------
// الزيادة على السعر: percent نسبة (لحد 100%) | amount مبلغ
const markupFields = {
  markupType: z.enum(["percent", "amount"]).default("percent"),
  markupValue: z.number().min(0, "MustBePositive").max(100_000).default(0),
  commissionPercent: z.number().min(0, "MustBePositive").max(100).default(0),
};
const percentLimit = (d) => d.markupType !== "percent" || d.markupValue <= 100;
const percentIssue = { message: "PercentMax", path: ["markupValue"] };

const salesChannelFields = {
  arName: requiredText(100),
  enName: requiredText(100),
  ...markupFields,
  sortOrder: z.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
};
export const createSalesChannelSchema = z
  .object(salesChannelFields)
  .refine(percentLimit, percentIssue);
export const updateSalesChannelSchema = z
  .object({ ...salesChannelFields, id: idField })
  .refine(percentLimit, percentIssue);

// تطبيقات شركة: الموجود في القائمة = مفعّل عندها بقيمه
export const companyChannelsSchema = z.object({
  companyId: idField,
  channels: z
    .array(
      z
        .object({ templateId: idField, ...markupFields })
        .refine(percentLimit, percentIssue),
    )
    .max(100),
});
export const companyIdSchema = z.object({ companyId: idField });
