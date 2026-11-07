"use client";

import { useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Space } from "antd";
import { DeleteOutlined, DatabaseOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import {
  deleteCompanyAction,
  deleteCompanyDbAction,
} from "@/actions/company.actions";

// ============================================================
// العمليات الخطيرة (نهائية): حذف قاعدة الشركة / حذف الشركة
// لازم يكتب كود الشركة للتأكيد
// ============================================================
export default function DangerZone({ company: c }) {
  const t = useTranslations("Companies");
  const router = useRouter();
  // "db" | "company" | null
  const [mode, setMode] = useState(null);

  return (
    <Space orientation="vertical" style={{ width: "100%" }}>
      <Alert type="warning" showIcon title={t("DangerNote")} />

      <Card size="small" title={t("DropDb")}>
        <p className="muted">{t("DropDbHint")}</p>
        <Button
          danger
          icon={<DatabaseOutlined />}
          onClick={() => setMode("db")}
        >
          {t("DropDb")}
        </Button>
      </Card>

      <Card size="small" title={t("DeleteCompany")}>
        <p className="muted">{t("DeleteCompanyHint")}</p>
        <Button
          danger
          type="primary"
          icon={<DeleteOutlined />}
          disabled={Boolean(c.provisionedAt)}
          onClick={() => setMode("company")}
        >
          {t("DeleteCompany")}
        </Button>
        {c.provisionedAt && (
          <div className="muted mt-2">{t("DropDbFirstHint")}</div>
        )}
      </Card>

      {mode && (
        <ConfirmModal
          c={c}
          mode={mode}
          onClose={() => setMode(null)}
          onDone={() => {
            setMode(null);
            if (mode === "company") router.replace("/companies");
          }}
        />
      )}
    </Space>
  );
}

function ConfirmModal({ c, mode, onClose, onDone }) {
  const t = useTranslations("Companies");
  const tAlerts = useTranslations("Alerts");
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const isDb = mode === "db";

  const submit = async () => {
    let v;
    try {
      v = await form.validateFields();
    } catch {
      return;
    }
    setBusy(true);
    const action = isDb ? deleteCompanyDbAction : deleteCompanyAction;
    const res = await action({ id: c.id, confirm: v.confirm });
    setBusy(false);
    if (!res.success) return showActionError(res, tAlerts, form);
    message.success(isDb ? t("DbDropped") : t("CompanyDeleted"));
    onDone();
  };

  return (
    <Modal
      open
      title={isDb ? t("DropDb") : t("DeleteCompany")}
      okText={isDb ? t("DropDb") : t("DeleteCompany")}
      okButtonProps={{ danger: true }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={submit}
    >
      <Alert
        type="error"
        showIcon
        className="mb-3"
        title={isDb ? t("DropDbWarn", { db: c.dbName }) : t("DeleteWarn")}
      />
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="confirm"
          label={t("TypeCode", { code: c.code })}
          rules={[
            { required: true, message: tAlerts("RequiredField") },
            {
              validator: (_, v) =>
                !v || v.trim().toUpperCase() === c.code
                  ? Promise.resolve()
                  : Promise.reject(new Error(tAlerts("ConfirmCodeWrong"))),
            },
          ]}
        >
          <Input dir="ltr" className="mono" placeholder={c.code} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
