"use client";

import { useMemo, useState } from "react";
import { Button, DatePicker, Input, Select, Table } from "antd";
import {
  FileExcelOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import PageHeader from "@/components/common/PageHeader";
import StateTag from "@/components/common/StateTag";
import { useAuth } from "@/components/common/AuthProvider";
import { SUB_STATES } from "@/lib/subscription";
import { formatDateTime } from "@/lib/dates";
import { exportCompaniesExcel } from "./exportCompanies";

export default function CompaniesView({ companies }) {
  const t = useTranslations("Companies");
  const ts = useTranslations("States");
  const locale = useLocale();
  const { can } = useAuth();
  // draft: اللي بيتكتب، q: اللي اتبحث بيه فعلاً
  const [draft, setDraft] = useState("");
  const [q, setQ] = useState("");
  const [state, setState] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [activityId, setActivityId] = useState(null);
  // فترة تاريخ الانتهاء / تاريخ البداية
  const [endsRange, setEndsRange] = useState(null);
  const [startsRange, setStartsRange] = useState(null);
  const [exporting, setExporting] = useState(false);
  const nm = (x) => (x ? (locale === "ar" ? x.arName : x.enName) : "—");

  // الباقات والأنشطة الموجودة في الشركات (للفلتر)
  const uniq = (key) =>
    Object.values(
      Object.fromEntries(
        companies.filter((c) => c[key]).map((c) => [c[key].id, c[key]]),
      ),
    );
  const plans = useMemo(() => uniq("plan"), [companies]);
  const activities = useMemo(() => uniq("activity"), [companies]);

  const inRange = (day, range) =>
    !range ||
    (day >= range[0].format("YYYY-MM-DD") &&
      day <= range[1].format("YYYY-MM-DD"));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return companies.filter(
      (c) =>
        (!state || c.sub.state === state) &&
        (!planId || c.plan?.id === planId) &&
        (!activityId || c.activity?.id === activityId) &&
        inRange(c.endsAt, endsRange) &&
        inRange(c.startsAt, startsRange) &&
        (!s ||
          [
            c.arName,
            c.enName,
            c.code,
            c.phone,
            c.email,
            c.contactName,
            c.city,
            c.taxNo,
            c.idNumber,
            String(c.serialNo),
          ]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(s))),
    );
  }, [companies, q, state, planId, activityId, endsRange, startsRange]);

  const exportExcel = async () => {
    setExporting(true);
    try {
      await exportCompaniesExcel(rows, { t, ts, locale, nm });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t("Title")}
        subtitle={
          rows.length === companies.length
            ? t("Count", { n: companies.length })
            : t("CountFiltered", { n: rows.length, total: companies.length })
        }
        extra={
          <>
            <Button
              icon={<FileExcelOutlined />}
              loading={exporting}
              disabled={!rows.length}
              onClick={exportExcel}
            >
              {t("ExportExcel")}
            </Button>
            {can("companies.create") && (
              <Link href="/companies/new">
                <Button type="primary" icon={<PlusOutlined />}>
                  {t("New")}
                </Button>
              </Link>
            )}
          </>
        }
      />
      {/* الفلاتر (على الموبايل كل فلتر في سطر) */}
      <div className="cp-filters">
        {/* البحث بيتنفذ بـ Enter أو الزرار (والمسح بيرجّع الكل) */}
        <Input.Search
          allowClear
          enterButton={<SearchOutlined />}
          placeholder={t("Search")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onSearch={(v) => setQ(v)}
          style={{ maxWidth: 360 }}
        />
        <Select
          allowClear
          placeholder={t("Status")}
          value={state}
          onChange={setState}
          style={{ width: 200 }}
          options={SUB_STATES.map((s) => ({ value: s, label: ts(s) }))}
        />
        <Select
          allowClear
          placeholder={t("Plan")}
          value={planId}
          onChange={setPlanId}
          style={{ width: 180 }}
          options={plans.map((p) => ({ value: p.id, label: nm(p) }))}
        />
        <Select
          allowClear
          placeholder={t("Activity")}
          value={activityId}
          onChange={setActivityId}
          style={{ width: 180 }}
          options={activities.map((a) => ({ value: a.id, label: nm(a) }))}
        />
        <DatePicker.RangePicker
          allowClear
          value={startsRange}
          onChange={setStartsRange}
          format="YYYY-MM-DD"
          placeholder={[t("StartsFrom"), t("StartsTo")]}
        />
        <DatePicker.RangePicker
          allowClear
          value={endsRange}
          onChange={setEndsRange}
          format="YYYY-MM-DD"
          placeholder={[t("EndsFrom"), t("EndsTo")]}
        />
      </div>
      <Table
        size="middle"
        rowKey="id"
        dataSource={rows}
        scroll={{ x: 1000 }}
        pagination={{ pageSize: 25, showSizeChanger: false }}
        columns={[
          { title: "#", dataIndex: "serialNo", width: 70 },
          {
            title: t("Company"),
            render: (_, c) => (
              <Link href={`/companies/${c.id}`}>
                <b>{nm(c)}</b>
              </Link>
            ),
          },
          {
            title: t("Code"),
            dataIndex: "code",
            render: (v) => <span className="mono">{v}</span>,
          },
          { title: t("Activity"), render: (_, c) => nm(c.activity) },
          { title: t("Plan"), render: (_, c) => nm(c.plan) },
          {
            title: t("StartsAt"),
            dataIndex: "startsAt",
            sorter: (a, b) => a.startsAt.localeCompare(b.startsAt),
            render: (v) => <bdi>{v}</bdi>,
          },
          {
            title: t("EndsAt"),
            sorter: (a, b) => a.endsAt.localeCompare(b.endsAt),
            dataIndex: "endsAt",
            render: (v) => <bdi>{v}</bdi>,
          },
          {
            title: t("DaysLeft"),
            sorter: (a, b) => a.sub.daysLeft - b.sub.daysLeft,
            render: (_, c) =>
              c.sub.daysLeft >= 0
                ? c.sub.daysLeft
                : t("DaysAgo", { n: -c.sub.daysLeft }),
          },
          { title: t("Status"), render: (_, c) => <StateTag sub={c.sub} /> },
          {
            title: t("LastSeen"),
            dataIndex: "lastSeenAt",
            render: (v) => (v ? <bdi>{formatDateTime(v, locale)}</bdi> : "—"),
          },
        ]}
      />
    </>
  );
}
