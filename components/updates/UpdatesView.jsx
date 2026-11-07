"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from "antd";
import { DatabaseOutlined } from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import { migrateSelectedAction } from "@/actions/company.actions";

// "20261120100000_item_note" ← { date: "2026-11-20", label: "item note" }
function describe(name) {
  const m = /^(\d{4})(\d{2})(\d{2})\d*_(.+)$/.exec(name ?? "");
  if (!m) return { date: "", label: name ?? "" };
  return { date: `${m[1]}-${m[2]}-${m[3]}`, label: m[4].replace(/_/g, " ") };
}

function MigrationName({ name }) {
  if (!name) return "—";
  const d = describe(name);
  return (
    <span>
      <bdi className="mono">{d.label}</bdi>{" "}
      <span className="muted">({d.date})</span>
    </span>
  );
}

// ============================================================
// تحديث قواعد الشركات (اختياري):
// - تختار الشركات اللي عايز تحدّثها بس
// - وتختار لحد أنهي تحديث (التحديثات بالترتيب، مينفعش تتخطى واحد)
// ============================================================
export default function UpdatesView({ migrations, companies, missing }) {
  const t = useTranslations("Updates");
  const tAlerts = useTranslations("Alerts");
  const tStatus = (s) => t(`Status_${s}`);
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [upTo, setUpTo] = useState(migrations.at(-1) ?? null);
  const [selected, setSelected] = useState([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  // التحديثات اللي هتتطبق على كل شركة لحد التحديث المختار
  const targetIdx = migrations.indexOf(upTo);
  const target = useMemo(
    () => new Set(migrations.slice(0, targetIdx + 1)),
    [migrations, targetIdx],
  );
  const rows = useMemo(
    () =>
      companies.map((c) => ({
        ...c,
        toApply: c.ok ? c.pending.filter((m) => target.has(m)) : [],
      })),
    [companies, target],
  );
  const canSelect = (r) => r.ok && !r.failed && r.toApply.length > 0;
  const selectable = rows.filter(canSelect).map((r) => r.id);
  const chosen = selected.filter((id) => selectable.includes(id));

  const run = async () => {
    setRunning(true);
    const res = await migrateSelectedAction({ ids: chosen, upTo });
    setRunning(false);
    if (!res.success) return showActionError(res, tAlerts);
    setResults(res.data.results);
    setSelected([]);
    const failed = res.data.results.filter((r) => r.error).length;
    if (failed) message.warning(t("Failed", { n: failed }));
    else message.success(t("Done", { n: res.data.applied }));
  };

  if (missing || !migrations.length)
    return (
      <>
        <PageHeader title={t("Title")} />
        <Alert type="error" showIcon title={tAlerts("MigrationsDirMissing")} />
      </>
    );

  return (
    <>
      <PageHeader title={t("Title")} subtitle={t("Subtitle")} />
      <Alert type="info" showIcon className="mb-4" title={t("Note")} />

      <Card size="small" className="mb-4">
        <Space wrap align="center">
          <span>{t("UpTo")}:</span>
          <Select
            style={{ minWidth: 320 }}
            value={upTo}
            onChange={setUpTo}
            options={[...migrations].reverse().map((m, i) => ({
              value: m,
              label: (
                <span>
                  <MigrationName name={m} />
                  {i === 0 && (
                    <Tag className="cp-chip" style={{ marginInlineStart: 6 }}>
                      {t("Latest")}
                    </Tag>
                  )}
                </span>
              ),
            }))}
          />
          <Button
            onClick={() =>
              // الشركات الملغية (مجددتش) مبتتختارش هنا، تقدر تعلّم عليها بإيدك
              setSelected(
                rows
                  .filter((r) => canSelect(r) && r.status !== "cancelled")
                  .map((r) => r.id),
              )
            }
          >
            {t("SelectAll")}
          </Button>
          <Button onClick={() => setSelected([])}>{t("Clear")}</Button>
          <Popconfirm
            title={t("Confirm", { n: chosen.length })}
            onConfirm={run}
            disabled={!chosen.length}
          >
            <Button
              type="primary"
              icon={<DatabaseOutlined />}
              loading={running}
              disabled={!chosen.length}
            >
              {t("Run", { n: chosen.length })}
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      {results?.some((r) => r.error) && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title={t("Failed", { n: results.filter((r) => r.error).length })}
          description={results
            .filter((r) => r.error)
            .map((r) => (
              <div key={r.id}>
                <bdi className="mono">{r.code}</bdi> — {nm(r)}:{" "}
                {tAlerts(r.error, r.details ?? undefined)}
              </div>
            ))}
        />
      )}

      <Table
        size="small"
        rowKey="id"
        dataSource={rows}
        pagination={false}
        scroll={{ x: 760 }}
        rowSelection={{
          selectedRowKeys: chosen,
          onChange: (keys) => setSelected(keys),
          getCheckboxProps: (r) => ({ disabled: !canSelect(r) }),
        }}
        expandable={{
          rowExpandable: (r) => r.toApply.length > 0,
          expandedRowRender: (r) => (
            <ol style={{ margin: 0, paddingInlineStart: 20 }}>
              {r.toApply.map((m) => (
                <li key={m}>
                  <MigrationName name={m} />
                </li>
              ))}
            </ol>
          ),
        }}
        columns={[
          { title: "#", dataIndex: "serialNo", width: 70 },
          {
            title: t("Code"),
            dataIndex: "code",
            width: 110,
            render: (v) => <span className="mono">{v}</span>,
          },
          {
            title: t("Company"),
            render: (_, r) => (
              <span>
                {nm(r)}{" "}
                {r.status !== "active" && (
                  <Tag color={r.status === "cancelled" ? "red" : "orange"}>
                    {tStatus(r.status)}
                  </Tag>
                )}
              </span>
            ),
          },
          {
            title: t("Last"),
            render: (_, r) => (r.ok ? <MigrationName name={r.last} /> : "—"),
          },
          {
            title: t("State"),
            width: 200,
            render: (_, r) =>
              !r.ok ? (
                <Tag color="red">{tAlerts(r.error)}</Tag>
              ) : r.failed ? (
                <Tag color="red">{t("StateFailed")}</Tag>
              ) : r.toApply.length ? (
                <Tag color="orange">
                  {t("StatePending", { n: r.toApply.length })}
                </Tag>
              ) : (
                <Tag color="green">{t("StateUpToDate")}</Tag>
              ),
          },
        ]}
      />
    </>
  );
}
