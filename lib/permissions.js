// ============================================================
// صلاحيات موظفي اللوحة
// - صاحب اللوحة (isOwner): كل الصلاحيات
// - غيره: الصلاحيات اللي في دوره
// staff.manage (الموظفين والأدوار) لصاحب اللوحة بس
// ============================================================
export const PERMISSION_GROUPS = [
  {
    key: "companies",
    permissions: [
      "companies.view",
      "companies.create",
      "companies.edit",
      "companies.renew",
      "companies.plan",
      "companies.suspend",
      "companies.support",
      "companies.resetAdmin",
      "companies.provision",
      "companies.delete",
    ],
  },
  { key: "plans", permissions: ["plans.view", "plans.manage"] },
  { key: "roleTemplates", permissions: ["roleTemplates.manage"] },
  { key: "paymentTemplates", permissions: ["paymentTemplates.manage"] },
  // تطبيقات التوصيل وتفعيلها عند الشركات
  { key: "salesChannels", permissions: ["salesChannels.manage"] },
  { key: "activities", permissions: ["activities.manage"] },
  {
    key: "backups",
    permissions: [
      "backups.manage",
      // استرجاع قاعدة شركة / قاعدة اللوحة نفسها (عمليات خطيرة)
      "backups.restore",
      "backups.restorePanel",
    ],
  },
  { key: "audit", permissions: ["audit.view"] },
  { key: "settings", permissions: ["settings.manage"] },
];

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions);

// صلاحيات صاحب اللوحة بس (مبتتحطش في أي دور)
export const OWNER_ONLY = ["staff.manage"];

export function can(user, permission) {
  if (!user) return false;
  if (user.isOwner) return true;
  if (OWNER_ONLY.includes(permission)) return false;
  return (user.permissions ?? []).includes(permission);
}
