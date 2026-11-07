import { addDays, dayOf, daysBetween, today } from "./dates";

// ============================================================
// حالة اشتراك الشركة (مشتركة بين اللوحة، وبعدين البرنامج الأساسي)
//   pending    : القاعدة لسه متعملتش
//   active     : شغال
//   expiring   : شغال، وفاضل expiringDays أو أقل
//   grace      : انتهى، بس في فترة السماح (شغال عادي + تنبيه)
//   readonly   : بعد السماح: يشوف ويطبع بس، من غير إضافة
//   expired    : بعد القراءة فقط: موقوف لحد التجديد
//   suspended  : موقوف يدوي من اللوحة
//   cancelled  : ملغي
// settings: { graceDays, readonlyDays, expiringDays } (الافتراضي من إعدادات اللوحة)
// ============================================================
export const SUB_STATES = [
  "pending",
  "active",
  "expiring",
  "grace",
  "readonly",
  "expired",
  "suspended",
  "cancelled",
];

// اللون لكل حالة (antd Tag)
export const SUB_COLORS = {
  pending: "default",
  active: "green",
  expiring: "gold",
  grace: "orange",
  readonly: "volcano",
  expired: "red",
  suspended: "red",
  cancelled: "default",
};

export function subscriptionState(company, settings, now = today()) {
  const graceDays = company.graceDays ?? settings?.graceDays ?? 0;
  const readonlyDays = company.readonlyDays ?? settings?.readonlyDays ?? 0;
  const expiringDays = settings?.expiringDays ?? 7;
  const endsAt = dayOf(company.endsAt);
  const graceEndsAt = addDays(endsAt, graceDays);
  const readonlyEndsAt = addDays(graceEndsAt, readonlyDays);
  const daysLeft = daysBetween(now, endsAt);
  const base = { daysLeft, endsAt, graceEndsAt, readonlyEndsAt };

  if (company.status === "pending") return { ...base, state: "pending" };
  if (company.status === "cancelled") return { ...base, state: "cancelled" };
  if (company.status === "suspended") return { ...base, state: "suspended" };
  if (now <= endsAt) {
    return { ...base, state: daysLeft <= expiringDays ? "expiring" : "active" };
  }
  if (now <= graceEndsAt) return { ...base, state: "grace" };
  if (now <= readonlyEndsAt) return { ...base, state: "readonly" };
  return { ...base, state: "expired" };
}
