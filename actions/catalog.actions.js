"use server";
import { runAction } from "@/lib/action";
import {
  activityActiveSchema,
  createActivitySchema,
  createPlanSchema,
  idSchema,
  settingsSchema,
  updateActivitySchema,
  updatePlanSchema,
  vendorSchema,
} from "@/validations/schemas";
import { createPlan, deletePlan, updatePlan } from "@/services/plan.service";
import {
  createActivity,
  deleteActivity,
  setActivityActive,
  updateActivity,
} from "@/services/activity.service";
import { saveSettings, saveVendor } from "@/services/settings.service";
import { syncAllCompanies } from "@/services/company.service";

const plans = { permission: "plans.manage", refresh: true };
const acts = { permission: "activities.manage", refresh: true };

export const createPlanAction = async (input) =>
  runAction(createPlanSchema, input, (d, u) => createPlan(d, u), plans);
export const updatePlanAction = async (input) =>
  runAction(updatePlanSchema, input, (d, u) => updatePlan(d, u), plans);
export const deletePlanAction = async (input) =>
  runAction(idSchema, input, (d, u) => deletePlan(d.id, u), plans);

// مصفوفة نصوص جاية كـ JSON جوه FormData
function parseList(v) {
  try {
    const a = JSON.parse(typeof v === "string" ? v : "[]");
    return Array.isArray(a) ? a.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// الإضافة والتعديل بيستقبلوا FormData (فيها ملف الصورة)
function readActivityForm(formData) {
  const id = formData.get("id");
  const image = formData.get("image");
  return {
    ...(id ? { id: Number(id) } : {}),
    arName: formData.get("arName") ?? "",
    enName: formData.get("enName") ?? "",
    isActive: formData.get("isActive") === "true",
    modules: parseList(formData.get("modules")),
    staffTitle: formData.get("staffTitle") || null,
    image: image instanceof File && image.size > 0 ? image : null,
    removeImage: formData.get("removeImage") === "true",
  };
}

export const createActivityAction = async (formData) =>
  runAction(
    createActivitySchema,
    readActivityForm(formData),
    (d, u) => createActivity(d, u),
    acts,
  );
export const updateActivityAction = async (formData) =>
  runAction(
    updateActivitySchema,
    readActivityForm(formData),
    (d, u) => updateActivity(d, u),
    acts,
  );
export const setActivityActiveAction = async (input) =>
  runAction(
    activityActiveSchema,
    input,
    (d, u) => setActivityActive(d, u),
    acts,
  );
export const deleteActivityAction = async (input) =>
  runAction(idSchema, input, (d, u) => deleteActivity(d.id, u), acts);

export const saveSettingsAction = async (input) =>
  runAction(
    settingsSchema,
    input,
    async (d, u) => {
      await saveSettings(d, u);
      // الافتراضيات (فترة السماح...) بتنزل لكل الشركات (زي تعديل الباقة)
      return syncAllCompanies();
    },
    {
      permission: "settings.manage",
      refresh: true,
    },
  );

// بيانات الشركة المالكة: FormData (فيها اللوجو) ← بعد الحفظ بتنزل عند كل العملاء
export const saveVendorAction = async (formData) => {
  const get = (k) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : null;
  };
  const logo = formData.get("logo");
  const input = {
    vendorArName: get("vendorArName"),
    vendorEnName: get("vendorEnName"),
    vendorPhone: get("vendorPhone"),
    vendorPhone2: get("vendorPhone2"),
    vendorWhatsapp: get("vendorWhatsapp"),
    vendorEmail: get("vendorEmail"),
    vendorWebsite: get("vendorWebsite"),
    vendorAddressAr: get("vendorAddressAr"),
    vendorAddressEn: get("vendorAddressEn"),
    vendorHoursAr: get("vendorHoursAr"),
    vendorHoursEn: get("vendorHoursEn"),
    logo: logo instanceof File && logo.size > 0 ? logo : null,
    removeLogo: get("removeLogo") === "true",
  };
  return runAction(
    vendorSchema,
    input,
    async (d, u) => {
      await saveVendor(d, u);
      return syncAllCompanies();
    },
    { permission: "settings.manage", refresh: true },
  );
};
