// ============================================================
// مبلغ الاشتراك حسب سعر الباقة والمدة
// - باقة سنوية: السعر × (عدد الشهور ÷ 12)
// - باقة شهرية: السعر × عدد الشهور
// المدة بالشهور (بكسور لو التاريخ مش شهر كامل)
// ============================================================
import dayjs from "dayjs";

export function planAmount(plan, fromDay, toDay) {
  if (!plan || !fromDay || !toDay) return null;
  const months = dayjs(toDay).diff(dayjs(fromDay), "month", true);
  if (!(months > 0)) return null;
  const price = Number(plan.price) || 0;
  const amount =
    plan.period === "month" ? price * months : (price * months) / 12;
  return Math.round(amount * 100) / 100;
}
