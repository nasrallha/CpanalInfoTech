"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Switch,
} from "antd";
import { PictureOutlined, PlusOutlined, TeamOutlined } from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/common/RowActions";
import ImageUploadItem from "@/components/common/ImageUploadItem";
import { useCrud } from "@/components/common/useCrud";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import { imageUrl } from "@/lib/image";
import {
  createActivityAction,
  deleteActivityAction,
  setActivityActiveAction,
  updateActivityAction,
} from "@/actions/catalog.actions";

// الأنشطة: نوع نشاط الشركة + صورة شاشة الدخول + وحداته في البرنامج
export default function ActivitiesView({ activities, modules = [] }) {
  const t = useTranslations("Activities");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const [toggling, setToggling] = useState(null);

  const crud = useCrud({
    create: createActivityAction,
    update: updateActivityAction,
    remove: deleteActivityAction,
    // الصورة القديمة بتظهر في حقل الرفع كملف موجود (url)
    toForm: (a) => ({
      arName: a.arName,
      enName: a.enName,
      isActive: a.isActive,
      modules: Array.isArray(a.modules) ? a.modules : [],
      staffTitle: a.staffTitle ?? "technician",
      image: a.background
        ? [
            {
              uid: "-1",
              name: a.background.split("/").pop(),
              status: "done",
              url: imageUrl(a.background),
            },
          ]
        : [],
    }),
    // FormData عشان ملف الصورة
    toPayload: (v) => {
      const fd = new FormData();
      fd.set("arName", v.arName ?? "");
      fd.set("enName", v.enName ?? "");
      fd.set("isActive", String(Boolean(v.isActive)));
      fd.set("modules", JSON.stringify(v.modules ?? []));
      fd.set("staffTitle", v.staffTitle ?? "technician");
      const file = v.image?.[0]?.originFileObj;
      if (file) fd.set("image", file);
      // كان فيه صورة واتشالت من غير بديل
      if (crud.current?.background && !(v.image ?? []).length)
        fd.set("removeImage", "true");
      return fd;
    },
  });

  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];

  const toggle = async (a, isActive) => {
    setToggling(a.id);
    const res = await setActivityActiveAction({ id: a.id, isActive });
    setToggling(null);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(isActive ? t("Activated") : t("Deactivated"));
  };

  return (
    <>
      <PageHeader
        title={t("Title")}
        subtitle={t("Subtitle")}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              crud.openNew({
                isActive: true,
                image: [],
                modules: [],
                staffTitle: "technician",
              })
            }
          >
            {t("New")}
          </Button>
        }
      />
      {/* الأنشطة كروت: الصورة + الاسم + عدد الشركات + نشط + تعديل وحذف */}
      <div className="activity-cards">
        {activities.map((a) => (
          <div
            key={a.id}
            className={`activity-card ${a.isActive ? "" : "is-off"}`}
          >
            <div className="activity-card__img">
              {a.background ? (
                <img src={imageUrl(a.background)} alt="" loading="lazy" />
              ) : (
                <PictureOutlined />
              )}
            </div>
            <div className="activity-card__body">
              <div className="activity-card__name">
                {locale === "ar" ? a.arName : a.enName}
              </div>
              <div className="activity-card__meta">
                <TeamOutlined />{" "}
                {t("CompaniesCount", { n: a._count.companies })}
              </div>
            </div>
            <div className="activity-card__foot">
              <Switch
                size="small"
                checked={a.isActive}
                loading={toggling === a.id}
                checkedChildren={t("Active")}
                unCheckedChildren={t("Inactive")}
                onChange={(v) => toggle(a, v)}
              />
              <RowActions
                onEdit={() => crud.openEdit(a)}
                onDelete={() => crud.remove(a)}
                canDelete={a._count.companies === 0}
                deleteHint={t("InUseHint")}
              />
            </div>
          </div>
        ))}
      </div>
      {/* مضغوطة: الاسمين جنب بعض، الوحدات عمودين، والشرح كعلامة استفهام */}
      <Modal
        open={crud.open}
        title={crud.isEdit ? t("Edit") : t("New")}
        onCancel={crud.close}
        onOk={crud.submit}
        confirmLoading={crud.saving}
        width={640}
        destroyOnHidden
      >
        <Form
          form={crud.form}
          key={crud.formKey}
          preserve={false}
          initialValues={crud.initialValues}
          layout="vertical"
          className="cp-compact-form"
        >
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="arName" label={t("ArName")} rules={req}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="enName" label={t("EnName")} rules={req}>
                <Input dir="ltr" />
              </Form.Item>
            </Col>
          </Row>
          {modules.length > 0 && (
            <Form.Item
              name="modules"
              label={t("Modules")}
              tooltip={t("ModulesHint")}
            >
              <Checkbox.Group
                className="cp-modules-grid"
                options={modules.map((m) => ({
                  value: m.key,
                  label: (locale === "ar" ? m.ar : m.en) || m.key,
                }))}
              />
            </Form.Item>
          )}
          <Row gutter={12} align="bottom">
            {/* اسم مقدم الخدمة في البرنامج (ثابت للنشاط) */}
            <Col xs={16} sm={14}>
              <Form.Item
                name="staffTitle"
                label={t("StaffTitle")}
                tooltip={t("StaffTitleHint")}
              >
                <Select
                  options={["technician", "staff", "barber", "therapist"].map(
                    (v) => ({ value: v, label: t(`StaffTitle_${v}`) }),
                  )}
                />
              </Form.Item>
            </Col>
            <Col xs={8} sm={10}>
              <Form.Item
                name="isActive"
                label={t("Status")}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <ImageUploadItem
            name="image"
            label={t("Background")}
            tooltip={t("ImageHint")}
          />
        </Form>
      </Modal>
    </>
  );
}
