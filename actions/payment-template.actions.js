"use server";
import { runAction } from "@/lib/action";
import {
  applyTemplatesSchema,
  createPaymentTemplateSchema,
  idSchema,
  importRolesSchema,
  updatePaymentTemplateSchema,
} from "@/validations/schemas";
import {
  applyPaymentTemplatesToCompanies,
  createPaymentTemplate,
  deletePaymentTemplate,
  getPaymentImportDatabases,
  importPaymentTemplates,
  updatePaymentTemplate,
} from "@/services/payment-template.service";

// قوالب طرق الدفع
const PERM = "paymentTemplates.manage";
const opts = { permission: PERM, refresh: true };

export const createPaymentTemplateAction = async (input) =>
  runAction(
    createPaymentTemplateSchema,
    input,
    (d, u) => createPaymentTemplate(d, u),
    opts,
  );
export const updatePaymentTemplateAction = async (input) =>
  runAction(
    updatePaymentTemplateSchema,
    input,
    (d, u) => updatePaymentTemplate(d, u),
    opts,
  );
export const deletePaymentTemplateAction = async (input) =>
  runAction(idSchema, input, (d, u) => deletePaymentTemplate(d.id, u), opts);

// القواعد اللي ينفع نستورد منها (فيها جدول طرق دفع)
export const paymentImportDatabasesAction = async () =>
  runAction(null, null, () => getPaymentImportDatabases(), {
    permission: PERM,
  });
export const importPaymentTemplatesAction = async (input) =>
  runAction(
    importRolesSchema,
    input,
    (d, u) => importPaymentTemplates(d, u),
    opts,
  );

// تطبيق القوالب على شركات مختارة
export const applyPaymentTemplatesAction = async (input) =>
  runAction(
    applyTemplatesSchema,
    input,
    (d, u) => applyPaymentTemplatesToCompanies(d, u),
    { permission: PERM },
  );
