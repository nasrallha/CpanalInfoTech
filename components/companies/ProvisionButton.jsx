"use client";

import { useState } from "react";
import { Button, Form, Input, Modal, Space } from "antd";
import { DatabaseOutlined, KeyOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import { provisionCompanyAction } from "@/actions/company.actions";

function generatePassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

// ============================================================
// زرار "إنشاء القاعدة"
// - باسورد مدير الشركة متسجل ← ينشئ على طول
// - مش متسجل (مثلاً بعد حذف القاعدة) ← يطلب باسورد جديد للمدير الأول
// ============================================================
export default function ProvisionButton({ company: c }) {
  const t = useTranslations("Companies");
  const tAlerts = useTranslations("Alerts");
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);

  const provision = async (adminPassword) => {
    setBusy(true);
    const res = await provisionCompanyAction(
      adminPassword ? { id: c.id, adminPassword } : { id: c.id },
    );
    setBusy(false);
    if (!res.success) {
      showActionError(res, tAlerts);
      return false;
    }
    message.success(t("CreatedReady"));
    setAsking(false);
    return true;
  };

  return (
    <>
      <Button
        type="primary"
        icon={<DatabaseOutlined />}
        loading={busy && !asking}
        onClick={() => (c.hasAdminPassword ? provision() : setAsking(true))}
      >
        {t("Provision")}
      </Button>
      {asking && (
        <PasswordModal
          c={c}
          t={t}
          tAlerts={tAlerts}
          busy={busy}
          onCancel={() => setAsking(false)}
          onOk={provision}
        />
      )}
    </>
  );
}

function PasswordModal({ c, t, tAlerts, busy, onCancel, onOk }) {
  const [form] = Form.useForm();
  return (
    <Modal
      open
      title={t("Provision")}
      okText={t("Provision")}
      confirmLoading={busy}
      onCancel={onCancel}
      onOk={async () => {
        try {
          const v = await form.validateFields();
          await onOk(v.adminPassword);
        } catch {
          // أخطاء الفورم بتظهر تحت الحقل
        }
      }}
    >
      <p className="muted">
        {t("NewAdminPasswordHint", { user: c.adminUsername })}
      </p>
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item label={t("AdminPassword")} required>
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item
              name="adminPassword"
              noStyle
              rules={[
                { required: true, message: tAlerts("RequiredField") },
                { min: 8, message: tAlerts("PasswordMin") },
              ]}
            >
              <Input dir="ltr" />
            </Form.Item>
            <Button
              icon={<KeyOutlined />}
              onClick={() =>
                form.setFieldValue("adminPassword", generatePassword())
              }
            >
              {t("Generate")}
            </Button>
          </Space.Compact>
        </Form.Item>
      </Form>
    </Modal>
  );
}
