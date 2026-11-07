"use client";

import { Button, Card, Table } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  HourglassOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  RiseOutlined,
  ShopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import PageHeader from "@/components/common/PageHeader";
import StateTag from "@/components/common/StateTag";
import { useAuth } from "@/components/common/AuthProvider";
import { C } from "@/theme/colors";

// كل حالة: [الأيقونة، لون الأيقونة، خلفيتها الفاتحة] (نفس ألوان تاجات الحالة)
const CARDS = [
  ["active", <CheckCircleOutlined />, C.success, C.successSoft],
  ["expiring", <ClockCircleOutlined />, C.yellow, C.yellowSoft],
  ["grace", <HourglassOutlined />, C.orange, C.orangeSoft],
  ["readonly", <EyeOutlined />, C.orangeDeep, C.orangeDeepSoft],
  ["expired", <CloseCircleOutlined />, C.danger, C.dangerSoft],
  ["suspended", <PauseCircleOutlined />, C.dangerText, C.dangerSoft],
  ["pending", <WarningOutlined />, C.muted, C.chip],
];

// كارت رقم واحد
function StatTile({ icon, label, value, tone, toneBg, brand }) {
  return (
    <div
      className={`stat-tile${brand ? " stat-tile--brand" : ""}`}
      style={tone ? { "--tone": tone, "--tone-bg": toneBg } : undefined}
    >
      <span className="stat-tile__icon">{icon}</span>
      <div className="stat-tile__body">
        <div className="stat-tile__label" title={label}>
          {label}
        </div>
        <div className="stat-tile__value">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardView({ data }) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Companies");
  const ts = useTranslations("States");
  const locale = useLocale();
  const { can } = useAuth();
  const nm = (x) => (x ? (locale === "ar" ? x.arName : x.enName) : "—");

  return (
    <>
      <PageHeader
        title={t("Title")}
        extra={
          can("companies.create") && (
            <Link href="/companies/new">
              <Button type="primary" icon={<PlusOutlined />}>
                {tc("New")}
              </Button>
            </Link>
          )
        }
      />
      <div className="stat-grid">
        <StatTile
          brand
          icon={<ShopOutlined />}
          label={t("Total")}
          value={data.total}
        />
        <StatTile
          icon={<RiseOutlined />}
          label={t("NewThisMonth")}
          value={data.newThisMonth}
        />
        {CARDS.map(([state, icon, tone, toneBg]) => (
          <StatTile
            key={state}
            icon={icon}
            tone={tone}
            toneBg={toneBg}
            label={ts(state)}
            value={data.counts[state] ?? 0}
          />
        ))}
      </div>

      <Card size="small" title={t("Attention", { days: data.expiringDays })}>
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={data.attention}
          locale={{ emptyText: t("NothingToDo") }}
          scroll={{ x: 700 }}
          columns={[
            {
              title: tc("Company"),
              render: (_, c) => (
                <Link href={`/companies/${c.id}`}>
                  <b>{nm(c)}</b>
                </Link>
              ),
            },
            { title: tc("Plan"), render: (_, c) => nm(c.plan) },
            {
              title: tc("EndsAt"),
              dataIndex: "endsAt",
              render: (v) => <bdi>{v}</bdi>,
            },
            {
              title: tc("DaysLeft"),
              render: (_, c) =>
                c.sub.daysLeft >= 0
                  ? c.sub.daysLeft
                  : tc("DaysAgo", { n: -c.sub.daysLeft }),
            },
            { title: tc("Status"), render: (_, c) => <StateTag sub={c.sub} /> },
            {
              title: tc("Phone"),
              dataIndex: "phone",
              render: (v) => <bdi>{v ?? "—"}</bdi>,
            },
          ]}
        />
      </Card>
    </>
  );
}
