// ============================================================
// تصدير الشركات (بعد الفلتر) لملف Excel
// exceljs بيتحمّل وقت الضغط بس (مش مع الصفحة)
// ============================================================
export async function exportCompaniesExcel(rows, { t, ts, locale, nm }) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(t("Title"), {
    views: [{ state: "frozen", ySplit: 1, rightToLeft: locale === "ar" }],
  });
  const address = (c) =>
    [c.city, c.district, c.street, c.buildingNo, c.additionalNo, c.postalCode]
      .filter(Boolean)
      .join(" - ");

  ws.columns = [
    { header: "#", key: "serial", width: 7 },
    { header: t("Code"), key: "code", width: 12 },
    { header: t("ArName"), key: "ar", width: 30 },
    { header: t("EnName"), key: "en", width: 30 },
    { header: t("Activity"), key: "activity", width: 18 },
    { header: t("Plan"), key: "plan", width: 18 },
    { header: t("Status"), key: "state", width: 16 },
    { header: t("StartsAt"), key: "starts", width: 13 },
    { header: t("EndsAt"), key: "ends", width: 13 },
    { header: t("DaysLeft"), key: "days", width: 12 },
    { header: t("ContactName"), key: "contact", width: 20 },
    { header: t("Phone"), key: "phone", width: 16 },
    { header: t("Email"), key: "email", width: 26 },
    { header: t("TaxNo"), key: "tax", width: 18 },
    { header: t("IdType"), key: "idType", width: 20 },
    { header: t("IdNumber"), key: "idNumber", width: 16 },
    { header: t("NationalAddress"), key: "address", width: 40 },
  ];
  for (const c of rows) {
    ws.addRow({
      serial: c.serialNo,
      code: c.code,
      ar: c.arName,
      en: c.enName,
      activity: c.activity ? nm(c.activity) : "",
      plan: c.plan ? nm(c.plan) : "",
      state: ts(c.sub.state),
      starts: c.startsAt,
      ends: c.endsAt,
      days: c.sub.daysLeft,
      contact: c.contactName ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      tax: c.taxNo ?? "",
      idType: c.idType ? t(`idType.${c.idType}`) : "",
      idNumber: c.idNumber ?? "",
      address: address(c),
    });
  }
  // راس الجدول: خط عريض وخلفية بلون البرنامج
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF006266" },
  };
  head.alignment = { vertical: "middle", horizontal: "center" };
  head.height = 22;
  ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `companies_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
