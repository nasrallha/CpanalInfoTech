"use client";

import { useState } from "react";
import { Alert, Button, Divider, Radio, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useTranslations } from "next-intl";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import PermissionPicker from "@/components/role-templates/PermissionPicker";
import { companyLocksAction } from "@/actions/company.actions";

// ============================================================
// الصلاحيات المقفولة على الشركة دي (حتى مدير النظام عندها) ← للمالك بس
// - «زي القايمة العامة» (الإعدادات) ← الافتراضي
// - «قايمة خاصة بالشركة» ← استثناء (تفتح أو تقفل حاجة لعميل معين)
// ============================================================
export default function CompanyLocks({ c, meta, globalLocks = [], canEdit }) {
  const t = useTranslations("Companies");
  const tAlerts = useTranslations("Alerts");
  const own = Array.isArray(c.blockedPermissions) ? c.blockedPermissions : null;
  const [mode, setMode] = useState(own ? "custom" : "global");
  const [value, setValue] = useState(own ?? globalLocks);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await companyLocksAction({ id: c.id, mode, permissions: value });
    setSaving(false);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("LocksSaved"));
    if (res.data?.synced === false && !res.data?.skipped)
      message.warning(t("SyncFailedNote"));
  };

  return (
    <>
      <Divider titlePlacement="start">{t("Locks")}</Divider>
      <Alert type="info" showIcon className="mb-3" title={t("LocksHint")} />
      <Space wrap className="mb-3">
        <Radio.Group
          value={mode}
          disabled={!canEdit}
          onChange={(e) => {
            setMode(e.target.value);
            // قايمة خاصة: تبدأ من العامة وتعدّل عليها
            if (e.target.value === "custom" && !own) setValue(globalLocks);
          }}
        >
          <Radio value="global">{t("LocksGlobal", { n: globalLocks.length })}</Radio>
          <Radio value="custom">{t("LocksCustom")}</Radio>
        </Radio.Group>
        {canEdit && (
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={save}
          >
            {t("Save")}
          </Button>
        )}
      </Space>
      {mode === "custom" &&
        (meta ? (
          <PermissionPicker
            meta={meta}
            value={value}
            onChange={canEdit ? setValue : undefined}
          />
        ) : (
          <Alert type="error" showIcon title={tAlerts("ErpPermissionsMissing")} />
        ))}
    </>
  );
}
