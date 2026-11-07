"use client";

import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Switch,
  Table,
  Tag,
} from "antd";
import { CrownOutlined, PlusOutlined } from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/common/RowActions";
import { useCrud } from "@/components/common/useCrud";
import { useAuth } from "@/components/common/AuthProvider";
import {
  createStaffAction,
  deleteStaffAction,
  updateStaffAction,
} from "@/actions/staff.actions";
import { formatDateTime } from "@/lib/dates";

// موظفين اللوحة (الدعم الفني وفريقك)
export default function StaffView({ staff, roles }) {
  const t = useTranslations("Staff");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const { user } = useAuth();
  const nm = (x) => (x ? (locale === "ar" ? x.arName : x.enName) : "—");
  const crud = useCrud({
    create: createStaffAction,
    update: updateStaffAction,
    remove: deleteStaffAction,
    toForm: (s) => ({ ...s, password: "" }),
  });
  const editingOwner = Boolean(crud.current?.isOwner);
  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];

  return (
    <>
      <PageHeader
        title={t("Title")}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => crud.openNew({ isActive: true })}
          >
            {t("New")}
          </Button>
        }
      />
      <Table
        rowKey="id"
        dataSource={staff}
        pagination={false}
        scroll={{ x: 800 }}
        columns={[
          {
            title: t("Name"),
            render: (_, s) => (
              <span>
                <b>{nm(s)}</b>{" "}
                {s.isOwner && (
                  <Tag color="gold" icon={<CrownOutlined />}>
                    {t("Owner")}
                  </Tag>
                )}
              </span>
            ),
          },
          {
            title: t("Username"),
            dataIndex: "username",
            render: (v) => <bdi className="mono">{v}</bdi>,
          },
          {
            title: t("Role"),
            render: (_, s) => (s.isOwner ? t("AllPermissions") : nm(s.role)),
          },
          {
            title: t("Phone"),
            dataIndex: "phone",
            render: (v) => <bdi>{v ?? "—"}</bdi>,
          },
          {
            title: t("LastLogin"),
            dataIndex: "lastLoginAt",
            render: (v) => (v ? <bdi>{formatDateTime(v, locale)}</bdi> : "—"),
          },
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
          {
            title: "",
            width: 90,
            render: (_, s) => (
              <RowActions
                onEdit={() => crud.openEdit({ ...s, id: s.id })}
                onDelete={() => crud.remove(s)}
                canDelete={!s.isOwner && s.id !== user.id}
              />
            ),
          },
        ]}
      />
      <Modal
        open={crud.open}
        title={crud.isEdit ? t("Edit") : t("New")}
        onCancel={crud.close}
        onOk={crud.submit}
        confirmLoading={crud.saving}
        destroyOnHidden
        width={640}
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
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
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
            <Col xs={24} md={12}>
              <Form.Item
                name="username"
                label={t("Username")}
                rules={[
                  ...req,
                  { min: 3, message: tAlerts("UsernameMin") },
                  {
                    pattern: /^[A-Za-z0-9._-]+$/,
                    message: tAlerts("UsernameInvalid"),
                  },
                ]}
              >
                <Input dir="ltr" autoComplete="off" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label={t("Password")}
                tooltip={crud.isEdit ? t("PasswordKeep") : null}
                rules={[
                  ...(crud.isEdit
                    ? []
                    : [{ required: true, message: tAlerts("RequiredField") }]),
                  { min: 8, message: tAlerts("PasswordMin") },
                ]}
              >
                <Input.Password dir="ltr" autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label={t("Phone")}>
                <Input dir="ltr" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label={t("Email")}>
                <Input dir="ltr" />
              </Form.Item>
            </Col>
            {!editingOwner && (
              <>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="roleId"
                    label={t("Role")}
                    rules={[
                      { required: true, message: tAlerts("RequiredField") },
                    ]}
                  >
                    <Select
                      options={roles
                        .filter((r) => r.isActive)
                        .map((r) => ({ value: r.id, label: nm(r) }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="isActive"
                    label={t("Status")}
                    valuePropName="checked"
                  >
                    <Switch />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
        </Form>
      </Modal>
    </>
  );
}
