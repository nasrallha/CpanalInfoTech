"use server";
import { runAction } from "@/lib/action";
import {
  applyTemplatesSchema,
  createRoleTemplateSchema,
  idSchema,
  importRolesSchema,
  updateRoleTemplateSchema,
} from "@/validations/schemas";
import {
  applyTemplatesToCompanies,
  createRoleTemplate,
  deleteRoleTemplate,
  getImportableDatabases,
  importRoleTemplates,
  updateRoleTemplate,
} from "@/services/role-template.service";

const opts = { permission: "roleTemplates.manage", refresh: true };

export const createRoleTemplateAction = async (input) =>
  runAction(
    createRoleTemplateSchema,
    input,
    (d, u) => createRoleTemplate(d, u),
    opts,
  );
export const updateRoleTemplateAction = async (input) =>
  runAction(
    updateRoleTemplateSchema,
    input,
    (d, u) => updateRoleTemplate(d, u),
    opts,
  );
export const deleteRoleTemplateAction = async (input) =>
  runAction(idSchema, input, (d, u) => deleteRoleTemplate(d.id, u), opts);

// القواعد اللي ينفع نستورد منها (فيها جدول أدوار)
export const importableDatabasesAction = async () =>
  runAction(null, null, () => getImportableDatabases(), {
    permission: "roleTemplates.manage",
  });
export const importRolesAction = async (input) =>
  runAction(
    importRolesSchema,
    input,
    (d, u) => importRoleTemplates(d, u),
    opts,
  );

// تطبيق القوالب على شركات مختارة
export const applyTemplatesAction = async (input) =>
  runAction(
    applyTemplatesSchema,
    input,
    (d, u) => applyTemplatesToCompanies(d, u),
    {
      permission: "roleTemplates.manage",
    },
  );
