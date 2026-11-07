"use client";

import { Table } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { formatDateTime } from "@/lib/dates";

// التفاصيل بشكل مختصر: key: value
function detailsText(d) {
  if (!d || typeof d !== "object") return "";
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(" · ");
}

export default function AuditTable({ logs, hideCompany }) {
  const t = useTranslations("Audit");
  const locale = useLocale();
  const nm = (x) => (x ? (locale === "ar" ? x.arName : x.enName) : "—");
  return (
    <Table
      size="small"
      rowKey="id"
      dataSource={logs}
      scroll={{ x: 900 }}
      pagination={{ pageSize: 50, showSizeChanger: false }}
      columns={[
        {
          title: t("Time"),
          dataIndex: "createdAt",
          width: 180,
          render: (v) => <bdi>{formatDateTime(v, locale)}</bdi>,
        },
        { title: t("Staff"), render: (_, l) => nm(l.staff) },
        {
          title: t("Action"),
          dataIndex: "action",
          render: (v) => {
            const key = `actions.${String(v).replace(/\./g, "_")}`;
            return t.has(key) ? t(key) : v;
          },
        },
        !hideCompany && {
          title: t("Company"),
          render: (_, l) =>
            l.company ? (
              <Link href={`/companies/${l.company.id}`}>{nm(l.company)}</Link>
            ) : (
              "—"
            ),
        },
        {
          title: t("Details"),
          dataIndex: "details",
          render: (v) => (
            <span className="muted" dir="auto">
              {detailsText(v)}
            </span>
          ),
        },
        {
          title: "IP",
          dataIndex: "ip",
          width: 130,
          // "::1" القديمة = الجهاز نفسه
          render: (v) =>
            v ? (
              <bdi dir="ltr" className="mono">
                {v === "::1" ? "127.0.0.1" : v.replace(/^::ffff:/i, "")}
              </bdi>
            ) : (
              "—"
            ),
        },
      ].filter(Boolean)}
    />
  );
}
