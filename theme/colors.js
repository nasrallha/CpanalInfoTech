// ============================================================
// ألوان لوحة التحكم كلها في مكان واحد (المصدر الوحيد)
// - في الـ JSX: import { C } from "@/theme/colors";  ← style={{ color: C.danger }}
// - في ملفات CSS: var(--cp-danger)  (المتغيرات بتتولد من نفس القيم هنا
//   وبتتحط في <head> من app/[locale]/layout.jsx)
// - antd (الأزرار، الحقول، القائمة ...) بياخد ألوانه من هنا (theme/antd.js)
// لتغيير لون في اللوحة كلها: غيّره هنا بس.
// (نفس فكرة lib/theme.js في البرنامج الأساسي، بس المتغيرات هنا --cp-)
// ============================================================

export const C = {
  // اللون الأساسي (تيل هادي) ودرجاته
  primary: "#0d9488", // الأزرار والروابط والتركيز
  primaryHover: "#0f766e", // الأزرار مع الماوس + كارت الإجمالي
  primaryActive: "#115e59", // الأزرار وهي مضغوطة
  primaryDeep: "#134e4a", // آخر التدرّج في صفحة الدخول
  primaryBright: "#14b8a6", // لمعة خفيفة (صفحة الدخول)
  primaryLight: "#5eead4", // العنصر المختار في القائمة + البوردر مع الماوس
  primaryBorder: "#99f6e4",
  primarySoft2: "#ccfbf1", // خلفية التحديد
  primarySoft: "#f0fdfa", // خلفية فاتحة جداً (صف الجدول مع الماوس)
  primaryRing: "rgba(13, 148, 136, 0.15)", // الحلقة حوالين الحقل وقت الكتابة
  primaryGlow: "rgba(20, 184, 166, 0.16)", // خلفية العنصر المختار في القائمة
  accent: "#0e7490", // اللمعة التانية في صفحة الدخول

  // القائمة الجانبية (فحمي)
  sider: "#111827",
  siderDeep: "#0b1220",
  onDark: "#ffffff", // النص فوق الخلفيات الغامقة

  // النصوص
  ink: "#0f172a", // العناوين
  text: "#1f2937", // النص العادي
  text2: "#334155", // عناوين الحقول
  text3: "#475569", // رأس الجداول
  muted: "#64748b", // النص الثانوي
  subtle: "#94a3b8", // علامات الاستفهام والأيقونات الباهتة

  // الخلفيات والحدود
  bg: "#f5f6f8", // خلفية الصفحة
  surface: "#ffffff", // الكروت والنوافذ
  surfaceAlt: "#f8fafb", // رأس الكروت والجداول
  chip: "#f1f5f9", // تاجات القوائم الرمادي + خلفية الاختيار التلاتي
  border: "#e6e9ee",
  borderStrong: "#d9dee5", // بوردر الحقول والأزرار
  borderSoft: "#e2e8f0",
  tableBorder: "#eef0f3",
  scrollbar: "#cbd5e1",

  // الحالات (اللون + نسخة للنص بتباين أعلى + خلفية فاتحة)
  success: "#16a34a", // السويتش وتاجات "نشط"
  successText: "#15803d",
  successSoft: "#f0fdf4",
  danger: "#dc2626",
  dangerText: "#b91c1c",
  dangerSoft: "#fef2f2",
  warning: "#d97706",
  warningText: "#b45309",
  yellow: "#ca8a04", // "قارب على الانتهاء"
  yellowSoft: "#fefce8",
  orange: "#ea580c", // "فترة سماح"
  orangeSoft: "#fff7ed",
  orangeDeep: "#c2410c", // "قراءة فقط"
  orangeDeepSoft: "#fff1eb",
  rose: "#e11d48", // "مقفلة" في الاختيار التلاتي
  roseText: "#be123c",
  info: "#0284c7",
};

// primarySoft → --cp-primary-soft
const kebab = (k) => k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

// متغيرات CSS لكل الألوان (بتتحط في :root)
export const themeCssVars = `:root{${Object.entries(C)
  .map(([k, v]) => `--cp-${kebab(k)}:${v};`)
  .join("")}}`;
