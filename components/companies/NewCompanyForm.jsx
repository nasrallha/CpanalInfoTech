"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from "antd";
import {
  KeyOutlined,
  PrinterOutlined,
  SaveOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import PageHeader from "@/components/common/PageHeader";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import { createCompanyAction } from "@/actions/company.actions";
import { addMonths, today } from "@/lib/dates";
import { planAmount } from "@/lib/plan-price";
import { moneyInputProps } from "@/lib/money";
import CompanyIdentityFields from "./CompanyIdentityFields";

// باسورد عشوائي سهل القراية (للمدير المؤقت)
function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

const toDay = (d) => (d ? d.format("YYYY-MM-DD") : null);

// ============================================================
// شركة جديدة: البيانات ← الباقة والاشتراك ← مدير الشركة ← قاعدة البيانات
// بعد الحفظ: ورقة جاهزة للطباعة فيها اللينك والكود وبيانات المدير
// ============================================================
export default function NewCompanyForm({
  plans,
  activities,
  defaults,
  suggested,
  erpUrl,
}) {
  const t = useTranslations("Companies");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const router = useRouter();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const start = today();

  // المبلغ أوتوماتيك من سعر الباقة والمدة (ويتعدّل بإيدك)
  const calcAmount = (v) =>
    planAmount(
      plans.find((p) => p.id === v.planId),
      toDay(v.startsAt),
      toDay(v.endsAt),
    );

  const setEnd = (months) => {
    const s = toDay(form.getFieldValue("startsAt")) ?? start;
    const endsAt = dayjs(addMonths(s, months));
    form.setFieldsValue({
      endsAt,
      amount: calcAmount({ ...form.getFieldsValue(), endsAt }),
    });
  };

  const onFinish = async (values) => {
    setSaving(true);
    const res = await createCompanyAction({
      ...values,
      code: suggested.code,
      startsAt: toDay(values.startsAt),
      endsAt: toDay(values.endsAt),
    });
    setSaving(false);
    if (!res.success) return showActionError(res, tAlerts, form);
    if (res.data.provisioned) message.success(t("CreatedReady"));
    else if (res.data.skipped) message.success(t("CreatedPending"));
    else message.warning(t("Created"));
    setResult({
      provisioned: res.data.provisioned,
      skipped: res.data.skipped,
      error: res.data.error,
      details: res.data.details,
      id: res.data.id,
      code: res.data.code,
      name: values.arName,
      admin: values.adminUsername,
      password: values.adminPassword,
    });
  };

  if (result) {
    const link = `${erpUrl.replace(/\/+$/, "")}/c/${result.code}`;
    return (
      <>
        <PageHeader title={t("CreatedTitle")} />
        {result.provisioned ? (
          <Alert
            type="success"
            showIcon
            className="mb-4 cp-print-hide"
            title={t("ReadyNote")}
          />
        ) : result.skipped ? (
          <Alert
            type="info"
            showIcon
            className="mb-4 cp-print-hide"
            title={t("SkippedNote")}
          />
        ) : (
          <Alert
            type="error"
            showIcon
            className="mb-4 cp-print-hide"
            title={t("ProvisionFailedNote")}
            description={tAlerts(
              result.error ?? "ProvisionFailed",
              result.details ?? undefined,
            )}
          />
        )}
        <div className="welcome-sheet" style={{ maxWidth: 640 }}>
          <div className="muted">{t("WelcomeSheetTitle")}</div>
          <h2 style={{ marginTop: 4 }}>{result.name}</h2>
          <div className="welcome-sheet__row">
            <span>{t("LoginLink")}</span>
            <bdi className="mono">{link}</bdi>
          </div>
          <div className="welcome-sheet__row">
            <span>{t("Code")}</span>
            <b className="mono">{result.code}</b>
          </div>
          <div className="welcome-sheet__row">
            <span>{t("AdminUsername")}</span>
            <bdi className="mono">{result.admin}</bdi>
          </div>
          <div className="welcome-sheet__row">
            <span>{t("AdminPassword")}</span>
            <bdi className="mono">{result.password}</bdi>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {t("ChangePasswordNote")}
          </p>
        </div>
        <Space className="mt-3 cp-print-hide" wrap>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            {t("Print")}
          </Button>
          <Button
            type="primary"
            onClick={() => router.push(`/companies/${result.id}`)}
          >
            {t("OpenCompany")}
          </Button>
          {/* السيرفر يجيب كود جديد ← الشاشة تتفتح من الأول فاضية */}
          <Button icon={<ShopOutlined />} onClick={() => router.refresh()}>
            {t("New")}
          </Button>
          <Link href="/companies">
            <Button>{t("BackToList")}</Button>
          </Link>
        </Space>
      </>
    );
  }

  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];

  // كل الفورم في الشاشة من غير نزول: عمودين على الشاشة العريضة
  // (بيانات الشركة | الاشتراك + المدير + قاعدة البيانات)، والحفظ فوق
  return (
    <>
      <PageHeader
        title={t("New")}
        subtitle={
          <span>
            {t("Code")}: <b className="mono">{suggested.code}</b>
          </span>
        }
        extra={
          <>
            <Link href="/companies">
              <Button>{t("Cancel")}</Button>
            </Link>
            <Button
              type="primary"
              htmlType="submit"
              form="newCompany"
              icon={<SaveOutlined />}
              loading={saving}
            >
              {t("Create")}
            </Button>
          </>
        }
      />
      <Form
        form={form}
        name="newCompany"
        layout="vertical"
        className="cp-compact-form"
        requiredMark={false}
        autoComplete="off"
        onFinish={onFinish}
        onValuesChange={(changed, all) => {
          if (
            "planId" in changed ||
            "startsAt" in changed ||
            "endsAt" in changed
          )
            form.setFieldValue("amount", calcAmount(all));
        }}
        initialValues={{
          amount: calcAmount({
            planId: plans[0]?.id ?? null,
            startsAt: dayjs(start),
            endsAt: dayjs(addMonths(start, 12)),
          }),
          startsAt: dayjs(start),
          endsAt: dayjs(addMonths(start, 12)),
          planId: plans[0]?.id ?? null,
          dbName: suggested.dbName,
          adminUsername: "admin",
          provisionNow: false,
        }}
      >
        <Row gutter={16}>
          {/* ===== بيانات الشركة ===== */}
          <Col xs={24} xl={14}>
            <Card
              size="small"
              className="mb-3"
              style={{ height: "calc(100% - 12px)" }}
              title={
                <span>
                  <ShopOutlined /> {t("SectionInfo")}
                </span>
              }
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
                      options={activities.map((a) => ({
                        value: a.id,
                        label: nm(a),
                      }))}
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
                <Col span={24}>
                  <Form.Item name="notes" label={t("Notes")} className="mb-0">
                    <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            {/* ===== الباقة والاشتراك ===== */}
            <Card
              size="small"
              className="mb-3"
              title={t("SectionSubscription")}
            >
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item name="planId" label={t("Plan")}>
                    <Select
                      allowClear
                      options={plans.map((p) => ({
                        value: p.id,
                        label: nm(p),
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="amount"
                    label={t("Amount")}
                    tooltip={t("AmountAutoHint")}
                  >
                    <InputNumber {...moneyInputProps} />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item
                    name="startsAt"
                    label={t("StartsAt")}
                    rules={[
                      { required: true, message: tAlerts("RequiredField") },
                    ]}
                  >
                    <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
                <Col xs={12}>
                  <Form.Item
                    name="endsAt"
                    label={t("EndsAt")}
                    rules={[
                      { required: true, message: tAlerts("RequiredField") },
                    ]}
                  >
                    <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
                  </Form.Item>
                </Col>
              </Row>
              <Space wrap size={4} className="mb-3">
                <span className="muted">{t("QuickPeriod")}:</span>
                {[1, 3, 6, 12, 24].map((m) => (
                  <Button key={m} size="small" onClick={() => setEnd(m)}>
                    {t("Months", { n: m })}
                  </Button>
                ))}
              </Space>
              <Row gutter={12}>
                {[
                  "maxUsers",
                  "maxBranches",
                  "maxInvoicesMonth",
                  "maxProducts",
                  "graceDays",
                  "readonlyDays",
                ].map((f) => (
                  <Col xs={12} sm={8} key={f}>
                    <Form.Item
                      name={f}
                      label={t(f)}
                      tooltip={t(`${f}Hint`, {
                        days:
                          f === "graceDays"
                            ? defaults.graceDays
                            : defaults.readonlyDays,
                      })}
                    >
                      <InputNumber
                        min={0}
                        precision={0}
                        style={{ width: "100%" }}
                        placeholder={t("Default")}
                      />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* ===== مدير الشركة + قاعدة البيانات ===== */}
            <Card size="small" className="mb-3" title={t("SectionAdmin")}>
              <Row gutter={12}>
                <Col xs={24} sm={10}>
                  <Form.Item
                    name="adminUsername"
                    label={t("AdminUsername")}
                    rules={[
                      ...req,
                      { min: 3, message: tAlerts("UsernameMin") },
                      {
                        pattern: /^[A-Za-z0-9._-]+$/,
                        message: tAlerts("UsernameInvalid"),
                      },
                    ]}
                  >
                    <Input dir="ltr" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={14}>
                  <Form.Item label={t("AdminPassword")} required>
                    <Space.Compact style={{ width: "100%" }}>
                      <Form.Item
                        name="adminPassword"
                        noStyle
                        rules={[
                          {
                            required: true,
                            message: tAlerts("RequiredField"),
                          },
                          { min: 8, message: tAlerts("PasswordMin") },
                        ]}
                      >
                        <Input dir="ltr" />
                      </Form.Item>
                      <Button
                        icon={<KeyOutlined />}
                        onClick={() =>
                          form.setFieldValue(
                            "adminPassword",
                            generatePassword(),
                          )
                        }
                      >
                        {t("Generate")}
                      </Button>
                    </Space.Compact>
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card size="small" className="mb-3" title={t("SectionDatabase")}>
              <Row gutter={12} align="bottom">
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="dbName"
                    label={t("DbName")}
                    tooltip={t("DbNameHint")}
                    rules={[
                      { required: true, message: tAlerts("RequiredField") },
                      {
                        pattern: /^[a-z][a-z0-9_]{2,47}$/,
                        message: tAlerts("DbNameInvalid"),
                      },
                    ]}
                    normalize={(v) => v?.toLowerCase()}
                  >
                    <Input dir="ltr" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="provisionNow"
                    valuePropName="checked"
                    tooltip={t("ProvisionNowHint")}
                    label=" "
                  >
                    <Checkbox>{t("ProvisionNow")}</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
              <Collapse
                ghost
                size="small"
                items={[
                  {
                    key: "adv",
                    label: t("Advanced"),
                    children: (
                      <Row gutter={12}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="dbUser"
                            label={t("DbUser")}
                            tooltip={t("AutoHint")}
                          >
                            <Input dir="ltr" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="dbPassword"
                            label={t("DbPassword")}
                            tooltip={t("AutoHint")}
                          >
                            <Input.Password dir="ltr" />
                          </Form.Item>
                        </Col>
                      </Row>
                    ),
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Form>
    </>
  );
}
