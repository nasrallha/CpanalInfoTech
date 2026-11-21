// ============================================================
// سيريال الشركة: الحقيقية 1, 2, 3 ... والتجريبية لوحدها من TRIAL_SERIAL_BASE
// (التجريبية بتظهر T1, T2 ... ومش بتاخد من سيريالات الحقيقية)
// ============================================================
export const TRIAL_SERIAL_BASE = 900000;

// السيريال للعرض: 5 أو T3
export const serialLabel = (c) =>
  c?.isTrial || Number(c?.serialNo) > TRIAL_SERIAL_BASE
    ? `T${Number(c.serialNo) - TRIAL_SERIAL_BASE}`
    : String(c?.serialNo ?? "");
