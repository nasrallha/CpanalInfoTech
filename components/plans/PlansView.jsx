"use client";

import {
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/common/RowActions";
import { useCrud } from "@/components/common/useCrud";
import { useAuth } from "@/components/common/AuthProvider";
import {
  createPlanAction,
  deletePlanAction,
  updatePlanAction,
} from "@/actions/catalog.actions";
import { formatMoney, moneyInputProps } from "@/lib/money";

// features: مميزات الباقات من البرنامج الأساسي [{ key, ar, en }]
export default function PlansView({ plans, features = [] }) {
  const t = useTranslations("Plans");
  const featureLabel = (key) => {
    const f = features.find((x) => x.key === key);
    const lbl = f ? (locale === "ar" ? f.ar : f.en) : null;
    return lbl || (t.has(`feature.${key}`) ? t(`feature.${key}`) : key);
  };
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const { can } = useAuth();
  const manage = can("plans.manage");
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const crud = useCrud({
    create: createPlanAction,
    update: updatePlanAction,
    remove: deletePlanAction,
    toForm: (p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    }),
  });
  const limit = (v) => (v == null ? <Tag>{t("Unlimited")}</Tag> : v);
  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];

  return (
    <>
      <PageHeader
        title={t("Title")}
        extra={
          manage && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                crud.openNew({
                  period: "year",
                  price: 0,
                  isActive: true,
                  features: [],
                })
              }
            >
              {t("New")}
            </Button>
          )
        }
      />
      <Table
        rowKey="id"
        size="middle"
        dataSource={plans}
        pagination={false}
        scroll={{ x: 900 }}
        columns={[
          { title: t("Name"), render: (_, p) => <b>{nm(p)}</b> },
          {
            title: t("Price"),
            render: (_, p) => (
              <bdi>
                <b>{formatMoney(p.price)}</b>{" "}
                <span className="muted">/ {t(`period.${p.period}`)}</span>
              </bdi>
            ),
          },
          { title: t("maxUsers"), dataIndex: "maxUsers", render: limit },
          { title: t("maxBranches"), dataIndex: "maxBranches", render: limit },
          {
            title: t("maxInvoicesMonth"),
            dataIndex: "maxInvoicesMonth",
            render: limit,
          },
          { title: t("maxProducts"), dataIndex: "maxProducts", render: limit },
          {
            title: t("Features"),
            render: (_, p) =>
              (Array.isArray(p.features) ? p.features : []).map((f) => (
                <Tag key={f} className="cp-chip" style={{ marginBottom: 4 }}>
                  {featureLabel(f)}
                </Tag>
              )),
          },
          { title: t("Companies"), render: (_, p) => p._count.companies },
          {
            title: t("Status"),
            dataIndex: "isActive",
            render: (v) =>
              v ? (
                <Tag color="green">{t("Active")}</Tag>
              ) : (
                <Tag>{t("Inactive")}</Tag>
              ),
          },
          manage && {
            title: "",
            width: 90,
            render: (_, p) => (
              <RowActions
                onEdit={() => crud.openEdit(p)}
                onDelete={() => crud.remove(p)}
                canDelete={p._count.companies === 0}
              />
            ),
          },
        ].filter(Boolean)}
      />
      <Modal
        open={crud.open}
        title={crud.isEdit ? t("Edit") : t("New")}
        onCancel={crud.close}
        onOk={crud.submit}
        confirmLoading={crud.saving}
        width={720}
        destroyOnHidden
      >
        <Form
          form={crud.form}
          key={crud.formKey}
          preserve={false}
          initialValues={crud.initialValues}
          layout="vertical"
          autoComplete="off"
          className="cp-compact-form"
        >
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="arName" label={t("ArName")} rules={req}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="enName" label={t("EnName")} rules={req}>
                <Input dir="ltr" />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item
                name="price"
                label={t("Price")}
                rules={[{ required: true, message: tAlerts("RequiredField") }]}
              >
                <InputNumber {...moneyInputProps} />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="period" label={t("Period")}>
                <Select
                  options={["month", "year"].map((p) => ({
                    value: p,
                    label: t(`period.${p}`),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item
                name="isActive"
                label={t("Status")}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            {["maxUsers", "maxBranches", "maxInvoicesMonth", "maxProducts"].map(
              (f) => (
                <Col xs={12} md={6} key={f}>
                  <Form.Item
                    name={f}
                    label={t(f)}
                    tooltip={t("EmptyUnlimited")}
                  >
                    <InputNumber
                      min={0}
                      precision={0}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
              ),
            )}
            <Col span={24}>
              <Form.Item
                name="features"
                label={t("Features")}
                tooltip={t("FeaturesHint")}
              >
                <Checkbox.Group
                  className="cp-modules-grid"
                  options={features.map((f) => ({
                    value: f.key,
                    label: featureLabel(f.key),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="notes" label={t("Notes")}>
                <Input.TextArea autoSize={{ minRows: 2 }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}
