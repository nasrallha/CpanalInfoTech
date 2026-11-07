// ============================================================
// التواريخ (أيام) بتوقيت السعودية UTC+3
// اليوم بيتكتب "YYYY-MM-DD"، وفي قاعدة البيانات عمود Date (منتصف الليل UTC)
// ============================================================
const OFFSET = 3 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? ""));

// النهارده (بتوقيت السعودية)
export const today = () =>
  new Date(Date.now() + OFFSET).toISOString().slice(0, 10);

// Date من قاعدة البيانات ← "YYYY-MM-DD"
export const dayOf = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// "YYYY-MM-DD" ← Date لعمود @db.Date
export const dayToDate = (day) => new Date(`${day}T00:00:00.000Z`);

export function addDays(day, n) {
  return new Date(dayToDate(day).getTime() + n * DAY)
    .toISOString()
    .slice(0, 10);
}

export function addMonths(day, n) {
  const d = dayToDate(day);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), last));
  return target.toISOString().slice(0, 10);
}

// عدد الأيام من a لـ b (b - a)
export const daysBetween = (a, b) =>
  Math.round((dayToDate(b).getTime() - dayToDate(a).getTime()) / DAY);

// وقت كامل للعرض (تاريخ + ساعة) بتوقيت السعودية وأرقام إنجليزي
// ثابت على السيرفر والمتصفح (عشان ميحصلش اختلاف في الـ hydration)
export function formatDateTime(value, locale = "ar") {
  if (!value) return "";
  return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
