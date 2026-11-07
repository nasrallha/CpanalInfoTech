"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import {
  CopyOutlined,
  CustomerServiceOutlined,
  DatabaseOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import StateTag from "@/components/common/StateTag";
import { useAuth } from "@/components/common/AuthProvider";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import AuditTable from "@/components/audit/AuditTable";
import ProvisionButton from "./ProvisionButton";
import DangerZone from "./DangerZone";
import FeaturesTab from "./FeaturesTab";
import CompanyIdentityFields from "./CompanyIdentityFields";
import { addMonths, today, formatDateTime } from "@/lib/dates";
import { planAmount } from "@/lib/plan-price";
import { formatMoney, moneyInputProps } from "@/lib/money";
import {
  changePlanAction,
  companyStatusAction,
  migrateCompanyAction,
  syncCompanyAction,
  renewCompanyAction,
  updateCompanyAction,
} from "@/actions/company.actions";

const toDay = (d) => (d ? d.format("YYYY-MM-DD") : null);

// التعديل اتحفظ في اللوحة، بس مكتبش في قاعدة الشركة (هتظهر في "المزامنة")
function warnSync(data, t) {
  if (data && data.synced === false && !data.skipped)
    message.warning(t("SyncFailedNote"));
}

export default function CompanyDetails({
  company: c,
  plans,
  activities,
  logs,
  erpUrl,
  dbStatus,
  features = [],
  modules = [],
}) {
  const t = useTranslations("Companies");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const { can } = useAuth();
  const nm = (x) => (x ? (locale === "ar" ? x.arName : x.enName) : "—");
  const link = `${erpUrl.replace(/\/+$/, "")}/c/${c.code}`;
  const [dbBusy, setDbBusy] = useState(false);

  // إنشاء القاعدة (إعادة محاولة) أو تحديث جداولها
  const runDb = async (action, ok) => {
    setDbBusy(true);
    const res = await action({ id: c.id });
    setDbBusy(false);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(ok(res.data));
    warnSync(res.data, t);
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(t("Copied"));
    } catch {
      message.error(tAlerts("UnexpectedError"));
    }
  };

  // ---------- البيانات ----------
  const overview = (
    <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
      <Descriptions.Item label={t("Serial")}>{c.serialNo}</Descriptions.Item>
      <Descriptions.Item label={t("Code")}>
        <Space>
          <b className="mono">{c.code}</b>
          <Button
            size="small"
            type="text"
            icon={<CopyOutlined />}
            onClick={() => copy(c.code)}
          />
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label={t("LoginLink")} span="filled">
        <Space wrap>
          <bdi className="mono">{link}</bdi>
          <Button
            size="small"
            icon={<CopyOutlined />}
            onClick={() => copy(link)}
          >
            {t("Copy")}
          </Button>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label={t("Status")}>
        <StateTag sub={c.sub} />
        {c.suspendReason && <span className="muted"> — {c.suspendReason}</span>}
      </Descriptions.Item>
      <Descriptions.Item label={t("Plan")}>{nm(c.plan)}</Descriptions.Item>
      <Descriptions.Item label={t("StartsAt")}>
        <bdi>{c.startsAt}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("EndsAt")}>
        <bdi>{c.endsAt}</bdi>{" "}
        <span className="muted">
          (
          {c.sub.daysLeft >= 0
            ? t("DaysLeftN", { n: c.sub.daysLeft })
            : t("DaysAgo", { n: -c.sub.daysLeft })}
          )
        </span>
      </Descriptions.Item>
      <Descriptions.Item label={t("GraceEndsAt")}>
        <bdi>{c.sub.graceEndsAt}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("ReadonlyEndsAt")}>
        <bdi>{c.sub.readonlyEndsAt}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("DbName")}>
        <bdi className="mono">{c.dbName}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("DbUser")}>
        <bdi className="mono">{c.dbUser}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("Database")}>
        <Space wrap>
          {!c.provisionedAt ? (
            <Tag color="orange">{t("DbNotCreated")}</Tag>
          ) : !dbStatus?.ok ? (
            <Tag color="red">{tAlerts(dbStatus?.error ?? "DbUnreachable")}</Tag>
          ) : dbStatus.failed ? (
            <Tag color="red">{t("DbMigrationFailed")}</Tag>
          ) : dbStatus.pending ? (
            <Tag color="orange">{t("DbPending", { n: dbStatus.pending })}</Tag>
          ) : (
            <Tag color="green">{t("DbReady")}</Tag>
          )}
          {c.provisionedAt &&
            dbStatus?.ok &&
            dbStatus.pending > 0 &&
            can("companies.provision") && (
              <Button
                size="small"
                icon={<DatabaseOutlined />}
                loading={dbBusy}
                onClick={() =>
                  runDb(migrateCompanyAction, (d) =>
                    t("DbMigrated", { n: d.applied }),
                  )
                }
              >
                {t("DbMigrate")}
              </Button>
            )}
          {/* إصلاح دخول البرنامج لقاعدة الشركة (مثلاً بعد إعادة تسطيب MySQL):
              بيعمل مستخدم MySQL بتاع الشركة من جديد بباسورده + أي تحديث ناقص */}
          {c.provisionedAt && can("companies.provision") && (
            <Button
              size="small"
              icon={<ToolOutlined />}
              loading={dbBusy}
              onClick={() =>
                runDb(migrateCompanyAction, () => t("DbUserRepaired"))
              }
            >
              {t("DbRepairUser")}
            </Button>
          )}
        </Space>
      </Descriptions.Item>
      {c.provisionedAt && (
        <Descriptions.Item label={t("Sync")}>
          <Space wrap>
            {c.syncError ? (
              <Tag color="red" title={c.syncError}>
                {t("SyncFailed")}
              </Tag>
            ) : c.syncedAt ? (
              <Tag color="green">
                {t("SyncedAt")} <bdi>{formatDateTime(c.syncedAt, locale)}</bdi>
              </Tag>
            ) : (
              <Tag color="orange">{t("NotSynced")}</Tag>
            )}
            {can("companies.edit") && (c.syncError || !c.syncedAt) && (
              <Button
                size="small"
                loading={dbBusy}
                onClick={() => runDb(syncCompanyAction, () => t("SyncDone"))}
              >
                {t("SyncNow")}
              </Button>
            )}
          </Space>
          {c.syncError && (
            <div className="muted mt-2">
              <bdi>{c.syncError}</bdi>
            </div>
          )}
        </Descriptions.Item>
      )}
      <Descriptions.Item label={t("AdminUsername")}>
        <bdi className="mono">{c.adminUsername}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("Activity")}>
        {nm(c.activity)}
      </Descriptions.Item>
      <Descriptions.Item label={t("ContactName")}>
        {c.contactName ?? "—"}
      </Descriptions.Item>
      <Descriptions.Item label={t("Phone")}>
        <bdi>{c.phone ?? "—"}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("Email")}>
        <bdi>{c.email ?? "—"}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("TaxNo")}>
        <bdi>{c.taxNo ?? "—"}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("IdNumber")}>
        {c.idNumber ? (
          <span>
            {c.idType ? `${t(`idType.${c.idType}`)}: ` : ""}
            <bdi>{c.idNumber}</bdi>
          </span>
        ) : (
          "—"
        )}
      </Descriptions.Item>
      <Descriptions.Item label={t("NationalAddress")} span="filled">
        {[
          c.city,
          c.district,
          c.street,
          c.buildingNo && `${t("BuildingNo")} ${c.buildingNo}`,
          c.additionalNo && `${t("AdditionalNo")} ${c.additionalNo}`,
          c.postalCode && `${t("PostalCode")} ${c.postalCode}`,
        ]
          .filter(Boolean)
          .join(" - ") || "—"}
      </Descriptions.Item>
      <Descriptions.Item label={t("CreatedBy")}>
        {nm(c.createdBy)} — <bdi>{formatDateTime(c.createdAt, locale)}</bdi>
      </Descriptions.Item>
      <Descriptions.Item label={t("LastSeen")} span="filled">
        {c.lastSeenAt ? <bdi>{formatDateTime(c.lastSeenAt, locale)}</bdi> : "—"}
      </Descriptions.Item>
    </Descriptions>
  );

  const items = [
    { key: "overview", label: t("TabOverview"), children: overview },
    {
      key: "subscription",
      label: t("TabSubscription"),
      children: (
        <SubscriptionTab
          c={c}
          plans={plans}
          can={can}
          t={t}
          tAlerts={tAlerts}
          nm={nm}
          locale={locale}
        />
      ),
    },
    {
      key: "features",
      label: t("TabFeatures"),
      children: (
        <FeaturesTab
          c={c}
          features={features}
          modules={modules}
          canEdit={can("companies.plan")}
        />
      ),
    },
    can("companies.edit") && {
      key: "edit",
      label: t("TabEdit"),
      children: (
        <EditTab
          c={c}
          activities={activities}
          t={t}
          tAlerts={tAlerts}
          nm={nm}
        />
      ),
    },
    can("companies.delete") && {
      key: "danger",
      label: t("TabDanger"),
      children: <DangerZone company={c} />,
    },
    {
      key: "support",
      label: t("TabSupport"),
      children: (
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Alert type="info" showIcon title={t("SupportSoon")} />
          <Space wrap>
            <Button icon={<CustomerServiceOutlined />} disabled>
              {t("SupportLogin")}
            </Button>
            <Button disabled>{t("ResetAdmin")}</Button>
          </Space>
        </Space>
      ),
    },
    {
      key: "audit",
      label: t("TabAudit"),
      children: <AuditTable logs={logs} hideCompany />,
    },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        title={nm(c)}
        subtitle={
          <span>
            #{c.serialNo} · <span className="mono">{c.code}</span> ·{" "}
            <StateTag sub={c.sub} />
          </span>
        }
      />
      {!c.provisionedAt && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title={t("PendingNote")}
          action={can("companies.provision") && <ProvisionButton company={c} />}
        />
      )}
      <Tabs items={items} />
    </>
  );
}

// ---------- الاشتراك: تجديد، تغيير باقة، إيقاف/تفعيل/إلغاء، السجل ----------
function SubscriptionTab({ c, plans, can, t, tAlerts, nm, locale }) {
  const [renewForm] = Form.useForm();
  const [busy, setBusy] = useState(null);
  const [planId, setPlanId] = useState(c.planId ?? null);
  const [reason, setReason] = useState("");
  // التجديد يبدأ من تاريخ النهاية (أو النهارده لو خلص)
  const base = c.endsAt > today() ? c.endsAt : today();
  // المبلغ بيتحسب أوتوماتيك من سعر الباقة الحالية والمدة (ويتعدّل بإيدك)
  const currentPlan = plans.find((p) => p.id === c.planId) ?? null;
  const amountFor = (end) => planAmount(currentPlan, base, toDay(end));

  const run = async (key, action, payload, ok) => {
    setBusy(key);
    const res = await action(payload);
    setBusy(null);
    if (!res.success)
      return showActionError(res, tAlerts, key === "renew" ? renewForm : null);
    message.success(ok);
    warnSync(res.data, t);
    return true;
  };

  const history = (
    <Table
      size="small"
      rowKey="id"
      pagination={false}
      dataSource={c.history}
      scroll={{ x: 700 }}
      columns={[
        {
          title: t("Date"),
          dataIndex: "createdAt",
          render: (v) => <bdi>{formatDateTime(v, locale)}</bdi>,
        },
        {
          title: t("Action"),
          dataIndex: "action",
          render: (v) => t(`history.${v}`),
        },
        { title: t("Plan"), render: (_, h) => nm(h.plan) },
        {
          title: t("Period"),
          render: (_, h) =>
            h.endsAt ? <bdi>{`${h.startsAt ?? ""} → ${h.endsAt}`}</bdi> : "—",
        },
        {
          title: t("Amount"),
          dataIndex: "amount",
          render: (v) => (v != null ? v : "—"),
        },
        { title: t("Note"), dataIndex: "note", render: (v) => v ?? "—" },
        { title: t("By"), render: (_, h) => nm(h.staff) },
      ]}
    />
  );

  return (
    <Row gutter={[12, 12]}>
      {can("companies.renew") && (
        <Col xs={24} lg={12}>
          <Card size="small" title={t("Renew")}>
            <Form
              form={renewForm}
              key={c.endsAt}
              preserve={false}
              layout="vertical"
              initialValues={{
                endsAt: dayjs(addMonths(base, 12)),
                amount: amountFor(dayjs(addMonths(base, 12))),
              }}
              onValuesChange={(changed) => {
                if ("endsAt" in changed)
                  renewForm.setFieldValue("amount", amountFor(changed.endsAt));
              }}
              onFinish={async (v) => {
                const ok = await run(
                  "renew",
                  renewCompanyAction,
                  {
                    id: c.id,
                    endsAt: toDay(v.endsAt),
                    amount: v.amount ?? null,
                    note: v.note,
                  },
                  t("Renewed"),
                );
                if (ok) renewForm.resetFields(["note"]);
              }}
            >
              <Space wrap className="mb-3">
                {[1, 3, 6, 12, 24].map((m) => (
                  <Button
                    key={m}
                    size="small"
                    onClick={() => {
                      const end = dayjs(addMonths(base, m));
                      renewForm.setFieldsValue({
                        endsAt: end,
                        amount: amountFor(end),
                      });
                    }}
                  >
                    +{t("Months", { n: m })}
                  </Button>
                ))}
              </Space>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="endsAt"
                    label={t("NewEndsAt")}
                    rules={[
                      { required: true, message: tAlerts("RequiredField") },
                    ]}
                  >
                    <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="amount"
                    label={t("Amount")}
                    extra={
                      currentPlan
                        ? t("PlanPriceHint", {
                            price: formatMoney(Number(currentPlan.price) || 0),
                            period: t(`Per_${currentPlan.period}`),
                          })
                        : t("NoPlanPriceHint")
                    }
                  >
                    <InputNumber {...moneyInputProps} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="note" label={t("Note")}>
                <Input />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={busy === "renew"}
                disabled={c.status === "cancelled"}
              >
                {t("Renew")}
              </Button>
            </Form>
          </Card>
        </Col>
      )}

      <Col xs={24} lg={12}>
        {can("companies.plan") && (
          <Card
            size="small"
            title={t("ChangePlan")}
            style={{ marginBottom: 12 }}
          >
            <Space.Compact style={{ width: "100%" }}>
              <Select
                allowClear
                style={{ width: "100%" }}
                value={planId}
                onChange={(v) => setPlanId(v ?? null)}
                options={plans.map((p) => ({ value: p.id, label: nm(p) }))}
              />
              <Button
                type="primary"
                loading={busy === "plan"}
                disabled={(planId ?? null) === (c.planId ?? null)}
                onClick={() =>
                  run(
                    "plan",
                    changePlanAction,
                    { id: c.id, planId: planId ?? null },
                    t("PlanChanged"),
                  )
                }
              >
                {t("Save")}
              </Button>
            </Space.Compact>
          </Card>
        )}

        {can("companies.suspend") && (
          <Card size="small" title={t("StatusActions")}>
            <Input
              className="mb-3"
              placeholder={t("Reason")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Space wrap>
              {c.status === "suspended" || c.status === "cancelled" ? (
                <Button
                  icon={<PlayCircleOutlined />}
                  loading={busy === "activate"}
                  onClick={() =>
                    run(
                      "activate",
                      companyStatusAction,
                      { id: c.id, action: "activate" },
                      t("Activated"),
                    )
                  }
                >
                  {t("Activate")}
                </Button>
              ) : (
                <Popconfirm
                  title={t("SuspendConfirm")}
                  onConfirm={() =>
                    run(
                      "suspend",
                      companyStatusAction,
                      { id: c.id, action: "suspend", reason },
                      t("Suspended"),
                    )
                  }
                >
                  <Button
                    danger
                    icon={<PauseCircleOutlined />}
                    loading={busy === "suspend"}
                  >
                    {t("Suspend")}
                  </Button>
                </Popconfirm>
              )}
              {c.status !== "cancelled" && (
                <Popconfirm
                  title={t("CancelConfirm")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() =>
                    run(
                      "cancel",
                      companyStatusAction,
                      { id: c.id, action: "cancel", reason },
                      t("Cancelled"),
                    )
                  }
                >
                  <Button
                    danger
                    type="primary"
                    icon={<StopOutlined />}
                    loading={busy === "cancel"}
                  >
                    {t("CancelCompany")}
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Card>
        )}
      </Col>

      <Col span={24}>
        <Card size="small" title={t("History")}>
          {history}
        </Card>
      </Col>
    </Row>
  );
}

// ---------- تعديل البيانات والحدود ----------
function EditTab({ c, activities, t, tAlerts, nm }) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];
  return (
    <Form
      form={form}
      layout="vertical"
      className="cp-compact-form"
      initialValues={{
        arName: c.arName,
        enName: c.enName,
        activityId: c.activityId,
        contactName: c.contactName,
        phone: c.phone,
        email: c.email,
        city: c.city,
        taxNo: c.taxNo,
        idType: c.idType,
        idNumber: c.idNumber,
        district: c.district,
        street: c.street,
        buildingNo: c.buildingNo,
        additionalNo: c.additionalNo,
        postalCode: c.postalCode,
        notes: c.notes,
        maxUsers: c.maxUsers,
        maxBranches: c.maxBranches,
        maxInvoicesMonth: c.maxInvoicesMonth,
        maxProducts: c.maxProducts,
        graceDays: c.graceDays,
        readonlyDays: c.readonlyDays,
      }}
      onFinish={async (v) => {
        setSaving(true);
        const res = await updateCompanyAction({ id: c.id, ...v });
        setSaving(false);
        if (!res.success) return showActionError(res, tAlerts, form);
        message.success(t("Saved"));
        if (res.data.infoSynced === false) message.warning(t("InfoSyncFailed"));
        warnSync(res.data, t);
      }}
    >
      <Row gutter={12}>
        <Col xs={24} sm={12} lg={8}>
          <Form.Item name="arName" label={t("ArName")} rules={req}>
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Form.Item name="enName" label={t("EnName")} rules={req}>
            <Input dir="ltr" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Form.Item name="activityId" label={t("Activity")}>
            <Select
              allowClear
              options={activities.map((a) => ({ value: a.id, label: nm(a) }))}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Form.Item name="contactName" label={t("ContactName")}>
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Form.Item name="phone" label={t("Phone")}>
            <Input dir="ltr" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Form.Item name="email" label={t("Email")}>
            <Input dir="ltr" />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Form.Item name="taxNo" label={t("TaxNo")}>
            <Input dir="ltr" />
          </Form.Item>
        </Col>
        <CompanyIdentityFields dense />
        {[
          "maxUsers",
          "maxBranches",
          "maxInvoicesMonth",
          "maxProducts",
          "graceDays",
          "readonlyDays",
        ].map((f) => (
          <Col xs={12} md={8} lg={4} key={f}>
            <Form.Item name={f} label={t(f)}>
              <InputNumber
                min={0}
                precision={0}
                style={{ width: "100%" }}
                placeholder={t("Default")}
              />
            </Form.Item>
          </Col>
        ))}
        <Col span={24}>
          <Form.Item name="notes" label={t("Notes")}>
            <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" loading={saving}>
        {t("Save")}
      </Button>
    </Form>
  );
}
