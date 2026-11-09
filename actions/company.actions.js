"use server";
import { runAction } from "@/lib/action";
import {
  changePlanSchema,
  companyFeaturesSchema,
  companyLocksSchema,
  createCompanySchema,
  dangerSchema,
  idSchema,
  provisionSchema,
  migrateSelectedSchema,
  renewSchema,
  statusSchema,
  updateCompanySchema,
} from "@/validations/schemas";
import {
  changePlan,
  createCompany,
  deleteCompany,
  deleteCompanyDb,
  migrateCompanies,
  migrateCompany,
  provisionCompany,
  saveCompanyLocks,
  setCompanyFeatures,
  syncCompanyNow,
  renewCompany,
  setCompanyStatus,
  suggestCompanyCode,
  updateCompany,
} from "@/services/company.service";

export const suggestCodeAction = async () =>
  runAction(null, null, () => suggestCompanyCode(), {
    permission: "companies.create",
  });

export const createCompanyAction = async (input) =>
  runAction(createCompanySchema, input, (d, u) => createCompany(d, u), {
    permission: "companies.create",
  });

export const updateCompanyAction = async (input) =>
  runAction(updateCompanySchema, input, (d, u) => updateCompany(d, u), {
    permission: "companies.edit",
    refresh: true,
  });

export const renewCompanyAction = async (input) =>
  runAction(renewSchema, input, (d, u) => renewCompany(d, u), {
    permission: "companies.renew",
    refresh: true,
  });

export const changePlanAction = async (input) =>
  runAction(changePlanSchema, input, (d, u) => changePlan(d, u), {
    permission: "companies.plan",
    refresh: true,
  });

export const companyStatusAction = async (input) =>
  runAction(statusSchema, input, (d, u) => setCompanyStatus(d, u), {
    permission: "companies.suspend",
    refresh: true,
  });

// تجهيز القاعدة (إعادة المحاولة لو الإنشاء فشل)
export const provisionCompanyAction = async (input) =>
  runAction(
    provisionSchema,
    input,
    (d, u) => provisionCompany(d.id, u, d.adminPassword ?? null),
    { permission: "companies.provision", refresh: true },
  );

// تحديث جداول شركة / كل الشركات
export const migrateCompanyAction = async (input) =>
  runAction(idSchema, input, (d, u) => migrateCompany(d.id, u), {
    permission: "companies.provision",
    refresh: true,
  });

export const migrateSelectedAction = async (input) =>
  runAction(migrateSelectedSchema, input, (d, u) => migrateCompanies(d, u), {
    permission: "companies.provision",
    refresh: true,
  });

// حذف قاعدة الشركة / حذف الشركة نهائياً (بكتابة الكود)
export const deleteCompanyDbAction = async (input) =>
  runAction(dangerSchema, input, (d, u) => deleteCompanyDb(d, u), {
    permission: "companies.delete",
    refresh: true,
  });

export const deleteCompanyAction = async (input) =>
  runAction(dangerSchema, input, (d, u) => deleteCompany(d, u), {
    permission: "companies.delete",
  });

// مزامنة الاشتراك مع قاعدة الشركة (لو فشلت قبل كده)
export const syncCompanyAction = async (input) =>
  runAction(idSchema, input, (d, u) => syncCompanyNow(d.id, u), {
    permission: "companies.edit",
    refresh: true,
  });

// استثناءات المميزات للشركة دي على باقتها
export const companyFeaturesAction = async (input) =>
  runAction(companyFeaturesSchema, input, (d, u) => setCompanyFeatures(d, u), {
    permission: "companies.plan",
    refresh: true,
  });

// الصلاحيات المقفولة على الشركة دي (زي العامة / قايمة خاصة)
export const companyLocksAction = async (input) =>
  runAction(companyLocksSchema, input, (d, u) => saveCompanyLocks(d, u), {
    permission: "companies.plan",
    refresh: true,
  });
