// ============================================================
// كود الشركة: 8 حروف وأرقام عشوائية (اللي بيظهر للعميل في اللينك وشاشة الدخول)
// - من غير الحروف اللي بتتلخبط: 0 O 1 I L
// - مش بيفرّق بين الكبير والصغير (بيتحفظ كبير)
// - أكتر من تريليون احتمال: مستحيل يتخمّن
// ============================================================
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;

export function newCompanyCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

// اللي المستخدم كتبه ← الشكل المتخزن
export const normalizeCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");

export const isCompanyCode = (value) =>
  new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(normalizeCode(value));

// اسم قاعدة البيانات: حروف إنجليزي صغيرة وأرقام و _ (يبدأ بحرف)، لحد 48 حرف
export const DB_NAME_RE = /^[a-z][a-z0-9_]{2,47}$/;
