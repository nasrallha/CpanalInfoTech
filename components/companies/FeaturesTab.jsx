"use client";

import { useState } from "react";
import { Alert, Button, Divider, Table, Tag } from "antd";
import TriToggle from "@/components/common/TriToggle";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  SaveOutlined,
} from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import { companyFeaturesAction } from "@/actions/company.actions";

const asObj = (o) => (o && typeof o === "object" && !Array.isArray(o) ? o : {});
const sameObj = (a, b) =>
  JSON.stringify(Object.entries(a).sort()) ===
  JSON.stringify(Object.entries(b).sort());

// ============================================================
// مميزات الشركة ووحدات نشاطها: لكل بند "حسب الباقة/النشاط" / "مفعّل" / "مقفول"
// للشركة دي بس (شركتين على نفس الباقة: واحدة بالزكاة والتانية من غيرها مثلاً)
// ============================================================
export default function FeaturesTab({ c, features, modules = [], canEdit }) {
  const t = useTranslations("Companies");
  const tAlerts = useTranslations("Alerts");
  const initial = asObj(c.featureOverrides);
  const initialModules = asObj(c.moduleOverrides);
  const [overrides, setOverrides] = useState(initial);
  const [moduleOverrides, setModuleOverrides] = useState(initialModules);
  const [saving, setSaving] = useState(false);

  const planFeatures = Array.isArray(c.plan?.features)
    ? new Set(c.plan.features)
    : null; // من غير باقة = كله مفتوح
  const activityModules = new Set(
    Array.isArray(c.activity?.modules) ? c.activity.modules : [],
  );

  const changed =
    !sameObj(overrides, initial) || !sameObj(moduleOverrides, initialModules);

  const save = async () => {
    setSaving(true);
    const res = await companyFeaturesAction({
      id: c.id,
      overrides,
      moduleOverrides,
    });
    setSaving(false);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("FeaturesSaved"));
    if (res.data?.synced === false && !res.data?.skipped)
      message.warning(t("SyncFailedNote"));
  };

  return (
    <>
      <Alert type="info" showIcon className="mb-4" title={t("FeaturesNote")} />
      <OverridesTable
        items={features}
        inBase={(k) => (planFeatures ? planFeatures.has(k) : true)}
        overrides={overrides}
        setOverrides={setOverrides}
        canEdit={canEdit}
        titles={{
          item: t("Feature"),
          base: t("InPlan"),
          follow: t("FollowPlan"),
        }}
      />

      {modules.length > 0 && (
        <>
          <Divider titlePlacement="start">{t("ActivityModules")}</Divider>
          <Alert
            type="info"
            showIcon
            className="mb-4"
            title={c.activity ? t("ModulesNote") : t("ModulesNoActivity")}
          />
          <OverridesTable
            items={modules}
            inBase={(k) => activityModules.has(k)}
            overrides={moduleOverrides}
            setOverrides={setModuleOverrides}
            canEdit={canEdit}
            titles={{
              item: t("Module"),
              base: t("InActivity"),
              follow: t("FollowActivity"),
            }}
          />
        </>
      )}

      {canEdit && (
        <Button
          type="primary"
          className="mt-3"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={!changed}
          onClick={save}
        >
          {t("Save")}
        </Button>
      )}
    </>
  );
}

// جدول بنود بثلاث حالات: حسب الأصل (الباقة/النشاط) / مفعّل / مقفول
function OverridesTable({
  items,
  inBase,
  overrides,
  setOverrides,
  canEdit,
  titles,
}) {
  const t = useTranslations("Companies");
  const locale = useLocale();
  const label = (f) => (locale === "ar" ? f.ar : f.en) || f.key;
  const effective = (key) =>
    overrides[key] === "on"
      ? true
      : overrides[key] === "off"
        ? false
        : inBase(key);
  const setOne = (key, v) =>
    setOverrides((o) => {
      const n = { ...o };
      if (v === "plan") delete n[key];
      else n[key] = v;
      return n;
    });

  return (
    <Table
      size="small"
      rowKey="key"
      dataSource={items}
      pagination={false}
      scroll={{ x: 640 }}
      columns={[
        { title: titles.item, render: (_, f) => <b>{label(f)}</b> },
        {
          title: titles.base,
          width: 110,
          render: (_, f) =>
            inBase(f.key) ? (
              <Tag color="green" icon={<CheckCircleFilled />}>
                {t("Yes")}
              </Tag>
            ) : (
              <Tag icon={<CloseCircleFilled />}>{t("No")}</Tag>
            ),
        },
        {
          title: t("ForThisCompany"),
          width: 340,
          render: (_, f) => (
            <TriToggle
              disabled={!canEdit}
              value={overrides[f.key] ?? "plan"}
              onChange={(v) => setOne(f.key, v)}
              labels={{
                plan: titles.follow,
                on: t("ForceOn"),
                off: t("ForceOff"),
              }}
            />
          ),
        },
        {
          title: t("Effective"),
          width: 110,
          render: (_, f) =>
            effective(f.key) ? (
              <Tag color="green" icon={<CheckCircleFilled />}>
                {t("Enabled")}
              </Tag>
            ) : (
              <Tag color="error" icon={<CloseCircleFilled />}>
                {t("Locked")}
              </Tag>
            ),
        },
      ]}
    />
  );
}
