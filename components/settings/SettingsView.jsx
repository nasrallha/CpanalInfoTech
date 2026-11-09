"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Tag,
} from "antd";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import {
  saveSettingsAction,
  saveVendorAction,
} from "@/actions/catalog.actions";
import ImageUploadItem from "@/components/common/ImageUploadItem";
import PermissionPicker from "@/components/role-templates/PermissionPicker";
import { saveClientLocksAction } from "@/actions/catalog.actions";
import { imageUrl } from "@/lib/image";

export default function SettingsView({ settings, status, permMeta, locks }) {
  const t = useTranslations("Settings");
  const tAlerts = useTranslations("Alerts");
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  return (
    <>
      <PageHeader title={t("Title")} />
      {/* الشاشة مليانة: الحالة والافتراضيات على اليمين، وبيانات الشركة المالكة
          جنبهم بباقي العرض (من غير ما تنزل تحت وتسيب مكان فاضي) */}
      <Row gutter={16} align="top">
        <Col xs={24} lg={9}>
          <Card size="small" className="mb-4" title={t("Status")}>
            <div className="mb-2">
              {t("SecretKey")}:{" "}
              {status.secretKey ? (
                <Tag color="green">{t("Ready")}</Tag>
              ) : (
                <Tag color="red">{t("Missing")}</Tag>
              )}
            </div>
            <div>
              {t("ErpUrl")}:{" "}
              {status.erpUrl ? (
                <bdi className="mono">{status.erpUrl}</bdi>
              ) : (
                <Tag color="red">{t("Missing")}</Tag>
              )}
            </div>
            <div className="mt-2">
              {t("Migrations")}:{" "}
              {status.migrations ? (
                <Tag color="green">
                  {t("MigrationsCount", { n: status.migrations })}
                </Tag>
              ) : (
                <Tag color="red">{t("Missing")}</Tag>
              )}
            </div>
            {!status.migrations && (
              <Alert
                type="error"
                showIcon
                className="mt-3"
                title={t("MigrationsHint")}
              />
            )}
            {!status.secretKey && (
              <Alert
                type="error"
                showIcon
                className="mt-3"
                title={t("SecretKeyHint")}
              />
            )}
          </Card>
          <Card size="small" className="mb-4" title={t("Defaults")}>
            <Form
              form={form}
              layout="vertical"
              initialValues={settings}
              onFinish={async (v) => {
                setSaving(true);
                const res = await saveSettingsAction(v);
                setSaving(false);
                if (!res.success) return showActionError(res, tAlerts, form);
                syncResult(res.data, t);
              }}
            >
              <Row gutter={12}>
                {["graceDays", "readonlyDays", "expiringDays"].map((f) => (
                  <Col xs={12} key={f}>
                    <Form.Item
                      name={f}
                      label={t(f)}
                      tooltip={t(`${f}Hint`)}
                      rules={[
                        { required: true, message: tAlerts("RequiredField") },
                      ]}
                    >
                      <InputNumber
                        min={f === "expiringDays" ? 1 : 0}
                        max={365}
                        precision={0}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                ))}
                <Col xs={12}>
                  <Form.Item
                    name="dbPrefix"
                    label={t("dbPrefix")}
                    tooltip={t("dbPrefixHint")}
                    rules={[
                      { required: true, message: tAlerts("RequiredField") },
                    ]}
                  >
                    <Input dir="ltr" />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={saving}>
                {t("Save")}
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <VendorCard settings={settings} />
        </Col>
      </Row>
      {/* الصلاحيات المقفولة على العملاء (عرض الشاشة كامل) */}
      <ClientLocksCard meta={permMeta} locks={locks} />
    </>
  );
}

// نتيجة تطبيق الإعدادات على الشركات
function syncResult({ total = 0, failed = 0 } = {}, t) {
  message.success(t("SavedSynced", { n: total - failed }));
  if (failed) message.warning(t("SyncFailedCount", { n: failed }));
}

// ---------- بيانات الشركة المالكة (الدعم الفني) ----------
// 3 في السطر (الكارت بياخد باقي عرض الشاشة)
const VENDOR_FIELDS = [
  ["vendorArName", 8, false],
  ["vendorEnName", 8, true],
  ["vendorPhone", 8, true],
  ["vendorPhone2", 8, true],
  ["vendorWhatsapp", 8, true],
  ["vendorEmail", 8, true],
  ["vendorWebsite", 8, true],
  ["vendorAddressAr", 8, false],
  ["vendorAddressEn", 8, true],
  ["vendorHoursAr", 12, false],
  ["vendorHoursEn", 12, true],
];

function VendorCard({ settings }) {
  const t = useTranslations("Settings");
  const tAlerts = useTranslations("Alerts");
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const initialLogo = settings.vendorLogo
    ? [
        {
          uid: "-1",
          name: settings.vendorLogo.split("/").pop(),
          status: "done",
          url: imageUrl(settings.vendorLogo),
        },
      ]
    : [];

  const onFinish = async (v) => {
    const fd = new FormData();
    for (const [f] of VENDOR_FIELDS) fd.set(f, v[f] ?? "");
    const file = v.logo?.[0]?.originFileObj;
    if (file) fd.set("logo", file);
    if (settings.vendorLogo && !(v.logo ?? []).length)
      fd.set("removeLogo", "true");
    setSaving(true);
    const res = await saveVendorAction(fd);
    setSaving(false);
    if (!res.success) return showActionError(res, tAlerts, form);
    syncResult(res.data, t);
  };

  return (
    <Card size="small" title={t("Vendor")} className="mb-4">
      <p className="muted">{t("VendorHint")}</p>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={{
          ...Object.fromEntries(
            VENDOR_FIELDS.map(([f]) => [f, settings[f] ?? ""]),
          ),
          logo: initialLogo,
        }}
        onFinish={onFinish}
      >
        <Row gutter={12}>
          {VENDOR_FIELDS.map(([f, md, ltr]) => (
            <Col xs={24} md={md} key={f}>
              <Form.Item name={f} label={t(f)}>
                <Input dir={ltr ? "ltr" : undefined} />
              </Form.Item>
            </Col>
          ))}
          <Col span={24}>
            <ImageUploadItem
              name="logo"
              label={t("vendorLogo")}
              extra={t("vendorLogoHint")}
            />
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={saving}>
          {t("Save")}
        </Button>
      </Form>
    </Card>
  );
}

// ---------- الصلاحيات المقفولة على العملاء ----------
// المعلَّم هنا مقفول على كل الشركات (حتى مدير النظام عندهم) ← للمالك بس
// (ولكل شركة استثناء من صفحتها: «المميزات»)
function ClientLocksCard({ meta, locks }) {
  const t = useTranslations("Settings");
  const tAlerts = useTranslations("Alerts");
  const [value, setValue] = useState(locks ?? []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await saveClientLocksAction({ permissions: value });
    setSaving(false);
    if (!res.success) return showActionError(res, tAlerts);
    syncResult(res.data, t);
  };

  return (
    <Card
      size="small"
      className="mb-4"
      title={t("ClientLocks")}
      extra={
        <Button
          type="primary"
          size="small"
          loading={saving}
          disabled={!meta}
          onClick={save}
        >
          {t("Save")}
        </Button>
      }
    >
      <Alert type="info" showIcon className="mb-3" title={t("ClientLocksHint")} />
      {meta ? (
        <PermissionPicker meta={meta} value={value} onChange={setValue} />
      ) : (
        <Alert type="error" showIcon title={tAlerts("ErpPermissionsMissing")} />
      )}
    </Card>
  );
}
