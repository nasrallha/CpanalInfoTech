import "server-only";
import { erpPermissions } from "./erp-meta";

// ============================================================
// صلاحيات مقفولة على العملاء (كل الشركات، حتى مدير النظام عندهم)
// - المالك بس اللي يقدر يعملها (من حسابه جوه الشركة)
// - القايمة العامة في إعدادات اللوحة، ولكل شركة استثناء (قايمة خاصة)
// القايمة الافتراضية (لحد ما تتحفظ من الإعدادات):
//   الفروع: إضافة وحذف | فواتير ومرتجعات البيع والشراء: تعديل وحذف وتغيير تاريخ
//   الدخول والأمان: كله
// ============================================================
const INVOICE_GROUPS = ["sales", "salesReturns", "purchases", "purchaseReturns"];
const INVOICE_ACTIONS = ["update", "delete", "changeDate"];

export async function defaultClientLocks() {
  const meta = await erpPermissions();
  return (meta?.all ?? []).filter((p) => {
    const [g, a] = p.split(".");
    if (g === "loginSecurity") return true;
    if (g === "branches") return a === "create" || a === "delete";
    return INVOICE_GROUPS.includes(g) && INVOICE_ACTIONS.includes(a);
  });
}

// القايمة العامة: المحفوظة، وإلا الافتراضية
export async function globalClientLocks(settings) {
  return Array.isArray(settings?.clientBlockedPermissions)
    ? settings.clientBlockedPermissions
    : defaultClientLocks();
}

// الصلاحيات المعروفة بس (من البرنامج الأساسي)، من غير تكرار
export async function cleanLocks(list) {
  const meta = await erpPermissions();
  const known = new Set(meta?.all ?? []);
  return [...new Set(list ?? [])].filter((p) => !meta || known.has(p));
}
