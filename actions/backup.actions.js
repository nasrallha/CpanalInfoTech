"use server";
import { runAction } from "@/lib/action";
import {
  backupCompaniesSchema,
  deleteBackupSchema,
  deleteBackupsSchema,
  panelBackupScheduleSchema,
  restoreCompanySchema,
  restorePanelSchema,
} from "@/validations/schemas";
import {
  backupCompanies,
  backupPanel,
  deletePanelBackup,
  deletePanelBackups,
  restoreCompany,
  restorePanel,
  savePanelBackupSchedule,
} from "@/services/backup.service";

const opts = { permission: "backups.manage", refresh: true };

export const backupCompaniesAction = async (input) =>
  runAction(
    backupCompaniesSchema,
    input,
    (d, u) => backupCompanies(d, u),
    opts,
  );

export const deleteBackupAction = async (input) =>
  runAction(deleteBackupSchema, input, (d, u) => deletePanelBackup(d, u), opts);

// حذف مجموعة ملفات (المحدد / الكل / القديم مع الإبقاء على آخر نسخة)
export const deleteBackupsAction = async (input) =>
  runAction(deleteBackupsSchema, input, (d, u) => deletePanelBackups(d, u), opts);

// نسخة من قاعدة اللوحة نفسها + مواعيد النسخ التلقائي
export const backupPanelAction = async () =>
  runAction(null, undefined, (_, u) => backupPanel(u), opts);

export const savePanelBackupScheduleAction = async (input) =>
  runAction(
    panelBackupScheduleSchema,
    input,
    (d, u) => savePanelBackupSchedule(d, u),
    opts,
  );

// الاسترجاع (صلاحيات منفصلة)
export const restoreCompanyAction = async (input) =>
  runAction(restoreCompanySchema, input, (d, u) => restoreCompany(d, u), {
    permission: "backups.restore",
    refresh: true,
  });

export const restorePanelAction = async (input) =>
  runAction(restorePanelSchema, input, (d, u) => restorePanel(d, u), {
    permission: "backups.restorePanel",
    refresh: true,
  });
