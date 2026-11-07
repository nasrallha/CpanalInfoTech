"use client";

import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/common/RowActions";
import { useCrud } from "@/components/common/useCrud";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from "@/actions/staff.actions";

// أدوار موظفي اللوحة وصلاحياتهم
export default function RolesView({ roles }) {
  const t = useTranslations("Roles");
  const tp = useTranslations("Perm");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const crud = useCrud({
    create: createRoleAction,
    update: updateRoleAction,
    remove: deleteRoleAction,
    toForm: (r) => ({
      ...r,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
    }),
  });
  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];

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
              crud.openNew({ isActive: true, permissions: ["companies.view"] })
            }
          >
            {t("New")}
          </Button>
        }
      />
      <Table
        rowKey="id"
        dataSource={roles}
        pagination={false}
        scroll={{ x: 600 }}
        columns={[
          {
            title: t("Name"),
            render: (_, r) => <b>{locale === "ar" ? r.arName : r.enName}</b>,
          },
          {
            title: t("Permissions"),
            render: (_, r) =>
              Array.isArray(r.permissions) ? r.permissions.length : 0,
          },
          { title: t("Staff"), render: (_, r) => r._count.staff },
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
            render: (_, r) => (
              <RowActions
                onEdit={() => crud.openEdit(r)}
                onDelete={() => crud.remove(r)}
                canDelete={r._count.staff === 0}
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
        width={760}
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
            <Col xs={24} sm={10}>
              <Form.Item name="arName" label={t("ArName")} rules={req}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item name="enName" label={t("EnName")} rules={req}>
                <Input dir="ltr" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={4}>
              <Form.Item
                name="isActive"
                label={t("Status")}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="permissions" label={t("Permissions")}>
            {/* مجموعات الصلاحيات عمودين (وعمود واحد على الموبايل) */}
            <Checkbox.Group
              className="cp-modules-grid"
              style={{ width: "100%" }}
            >
              {PERMISSION_GROUPS.map((g) => (
                <Card
                  key={g.key}
                  size="small"
                  title={tp(`group.${g.key}`)}
                  className="mb-3"
                  style={{ width: "100%" }}
                >
                  {g.permissions.map((p) => (
                    <div key={p} style={{ padding: "3px 0" }}>
                      <Checkbox value={p}>{tp(p.replace(".", "_"))}</Checkbox>
                    </div>
                  ))}
                </Card>
              ))}
            </Checkbox.Group>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
