// ============================================================
// تنسيق المبالغ: فواصل الآلاف وكسرين بحد أقصى، وأرقام إنجليزي (زي التواريخ)
// 1500 ← "1,500" ، 1234.5 ← "1,234.5"
// ============================================================
const FMT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const formatMoney = (v) =>
  v == null || v === "" || Number.isNaN(Number(v)) ? "—" : FMT.format(v);

// خصائص InputNumber للمبالغ: الفواصل بتظهر وانت بتكتب، والقيمة رقم عادي
export const moneyInputProps = {
  min: 0,
  formatter: (v) => {
    if (v == null || v === "") return "";
    const [int, dec] = String(v).split(".");
    const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return dec != null ? `${withCommas}.${dec}` : withCommas;
  },
  parser: (v) => (v ?? "").replace(/,/g, ""),
  style: { width: "100%" },
};
