"use client";

import { useState } from "react";
import { Alert, Button, Col, Form, Input, Row } from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { loginAction, setupAction } from "@/actions/auth.actions";
import { applyFieldErrors } from "@/lib/form-errors";
import "./login.css";

// ============================================================
// شاشة الدخول (نفس تصميم البرنامج الأساسي: أبيض + أخضر)
// needsSetup: مفيش أي موظف ← فورم إنشاء صاحب اللوحة
// ============================================================
export default function LoginScreen({ needsSetup }) {
  const t = useTranslations("Auth");
  const tc = useTranslations("Common");

  return (
    <div className="login-page">
      {/* لوحة التعريف (تختفي في الشاشات الصغيرة) */}
      <aside className="login-brand">
        <div className="login-brand__glow login-brand__glow--one" />
        <div className="login-brand__glow login-brand__glow--two" />

        <div className="login-brand__content">
          <div className="login-logo">
            <SafetyCertificateOutlined />
          </div>
          <h1 className="login-brand__title">{t("BrandTitle")}</h1>
          <p className="login-brand__tagline">{t("BrandText")}</p>

          <ul className="login-features">
            <Feature
              icon={<ShopOutlined />}
              title={t("BrandCompanies")}
              text={t("BrandCompaniesText")}
            />
            <Feature
              icon={<AppstoreOutlined />}
              title={t("BrandPlans")}
              text={t("BrandPlansText")}
            />
            <Feature
              icon={<AuditOutlined />}
              title={t("BrandAudit")}
              text={t("BrandAuditText")}
            />
          </ul>
        </div>

        <p className="login-brand__footer">
          © {new Date().getFullYear()} {tc("AppName")}
        </p>
      </aside>

      {/* الفورم */}
      <main className="login-panel">
        <div
          className={`login-panel__top${needsSetup ? " login-panel__top--wide" : ""}`}
        >
          <LanguageToggle />
        </div>

        <div className={`login-card${needsSetup ? " login-card--wide" : ""}`}>
          {/* الشعار في الموبايل بس */}
          <div className="login-logo login-logo--mobile">
            <SafetyCertificateOutlined />
          </div>
          <LoginForm needsSetup={needsSetup} />
        </div>

        <p className="login-panel__secure">
          <SafetyCertificateOutlined /> {t("SecureNote")}
        </p>
      </main>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <li className="login-feature">
      <span className="login-feature__icon">{icon}</span>
      <div>
        <div className="login-feature__title">{title}</div>
        <div className="login-feature__text">{text}</div>
      </div>
    </li>
  );
}

function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      className="login-lang"
      onClick={() => router.replace(pathname, { locale: next })}
    >
      {next === "ar" ? "العربية" : "English"}
    </button>
  );
}

function LoginForm({ needsSetup }) {
  const t = useTranslations("Auth");
  const tAlerts = useTranslations("Alerts");
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);
    const data = { ...values };
    delete data.confirm;
    const res = needsSetup ? await setupAction(data) : await loginAction(data);
    if (!res.success) {
      setLoading(false);
      applyFieldErrors(form, res.fieldErrors, tAlerts);
      setError(tAlerts(res.error));
      if (!needsSetup) form.setFieldValue("password", "");
      return;
    }
    router.replace("/");
  };

  return (
    <>
      <h2 className="login-card__title">
        {needsSetup ? t("SetupTitle") : t("Title")}
      </h2>
      <p className="login-card__subtitle">
        {needsSetup ? t("SetupSubtitle") : t("Subtitle")}
      </p>

      {error && <Alert type="error" showIcon title={error} className="mb-4" />}

      <Form
        form={form}
        layout="vertical"
        size="large"
        requiredMark={false}
        onFinish={onFinish}
        autoComplete="off"
      >
        {needsSetup && (
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="arName" label={t("ArName")} rules={req}>
                <Input autoComplete="off" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="enName" label={t("EnName")} rules={req}>
                <Input autoComplete="off" dir="ltr" />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Form.Item name="username" label={t("Username")} rules={req}>
          <Input
            autoComplete="off"
            prefix={<UserOutlined className="login-input-icon" />}
            placeholder={t("UsernamePlaceholder")}
            dir="ltr"
            autoFocus={!needsSetup}
          />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={needsSetup ? 12 : 24}>
            <Form.Item
              name="password"
              label={t("Password")}
              rules={[
                { required: true, message: tAlerts("RequiredField") },
                ...(needsSetup
                  ? [{ min: 8, message: tAlerts("PasswordMin") }]
                  : []),
              ]}
            >
              <Input.Password
                //  autoComplete="new-password"
                prefix={<LockOutlined className="login-input-icon" />}
                placeholder="••••••••"
                dir="ltr"
              />
            </Form.Item>
          </Col>
          {needsSetup && (
            <Col xs={24} sm={12}>
              <Form.Item
                name="confirm"
                label={t("ConfirmPassword")}
                dependencies={["password"]}
                rules={[
                  { required: true, message: tAlerts("RequiredField") },
                  ({ getFieldValue }) => ({
                    validator: (_, v) =>
                      !v || v === getFieldValue("password")
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(tAlerts("PasswordsNotMatch")),
                          ),
                  }),
                ]}
              >
                <Input.Password
                  // autoComplete="new-password"
                  prefix={<LockOutlined className="login-input-icon" />}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </Form.Item>
            </Col>
          )}
        </Row>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={loading}
          className="login-submit"
        >
          {needsSetup ? t("CreateOwner") : t("Login")}
        </Button>
      </Form>
    </>
  );
}
