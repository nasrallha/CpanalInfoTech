"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import {
  CloudUploadOutlined,
  ImportOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/common/RowActions";
import { useCrud } from "@/components/common/useCrud";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import {
  applyPaymentTemplatesAction,
  createPaymentTemplateAction,
  deletePaymentTemplateAction,
  importPaymentTemplatesAction,
  paymentImportDatabasesAction,
  updatePaymentTemplateAction,
} from "@/actions/payment-template.actions";

// نفس أنواع طرق الدفع في البرنامج الأساسي
const TYPES = ["cash", "card", "wallet", "transfer", "credit"];
const TYPE_COLORS = {
  cash: "blue",
  card: "blue",
  wallet: "purple",
  transfer: "purple",
  credit: "orange",
};

// ============================================================
// قوالب طرق الدفع: طرق دفع ثابتة بتنزل عند الشركات
// - شركة جديدة: بتنزل لوحدها مع "إنشاء القاعدة"
// - أي تعديل بعد كده: "تطبيق على الشركات" وتختار الشركات
// - الشركة تقدر توقفها وتشغّلها بس
// ============================================================
export default function PaymentTemplatesView({ templates, companies }) {
  const t = useTranslations("PaymentTemplates");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [importOpen, setImportOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const crud = useCrud({
    create: createPaymentTemplateAction,
    update: updatePaymentTemplateAction,
    remove: deletePaymentTemplateAction,
    toForm: (r) => ({
      arName: r.arName,
      enName: r.enName,
      type: r.type,
      requiresReference: r.requiresReference,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
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
          <Space wrap>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportOpen(true)}
            >
              {t("Import")}
            </Button>
            <Button
              icon={<CloudUploadOutlined />}
              onClick={() => setApplyOpen(true)}
              disabled={!templates.length || !companies.length}
            >
              {t("Apply")}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                crud.openNew({
                  type: "card",
                  requiresReference: false,
                  sortOrder: (templates.at(-1)?.sortOrder ?? 0) + 1,
                  isActive: true,
                })
              }
            >
              {t("New")}
            </Button>
          </Space>
        }
      />
      <Alert type="info" showIcon className="mb-4" title={t("Note")} />

      <Table
        rowKey="id"
        dataSource={templates}
        pagination={false}
        scroll={{ x: 600 }}
        columns={[
          { title: t("SortOrder"), dataIndex: "sortOrder", width: 80 },
          { title: t("Name"), render: (_, r) => <b>{nm(r)}</b> },
          {
            title: t("Type"),
            dataIndex: "type",
            render: (v) => <Tag color={TYPE_COLORS[v]}>{t(`types.${v}`)}</Tag>,
          },
          {
            title: t("RequiresReference"),
            dataIndex: "requiresReference",
            render: (v) => (v ? <Tag color="green">{t("Yes")}</Tag> : "—"),
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
            render: (_, r) => (
              <RowActions
                onEdit={() => crud.openEdit(r)}
                onDelete={() => crud.remove(r)}
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
        width={620}
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
            <Col xs={12} sm={8}>
              <Form.Item name="type" label={t("Type")} rules={req.slice(0, 1)}>
                <Select
                  options={TYPES.map((v) => ({
                    value: v,
                    label: t(`types.${v}`),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item
                name="sortOrder"
                label={t("SortOrder")}
                tooltip={t("SortOrderHint")}
              >
                <InputNumber min={0} max={999} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={5}>
              <Form.Item
                name="requiresReference"
                label={t("RequiresReference")}
                tooltip={t("RequiresReferenceHint")}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col xs={12} sm={5}>
              <Form.Item
                name="isActive"
                label={t("Status")}
                tooltip={t("StatusHint")}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {applyOpen && (
        <ApplyModal companies={companies} onClose={() => setApplyOpen(false)} />
      )}
    </>
  );
}

// ---------- استيراد طرق الدفع من قاعدة (زي FirstPos) ----------
function ImportModal({ onClose }) {
  const t = useTranslations("PaymentTemplates");
  const tAlerts = useTranslations("Alerts");
  const [dbs, setDbs] = useState(null);
  const [dbName, setDbName] = useState(null);
  const [busy, setBusy] = useState(false);

  // القواعد اللي فيها طرق دفع (مرة واحدة لما النافذة تتفتح)
  useEffect(() => {
    let alive = true;
    paymentImportDatabasesAction().then((res) => {
      if (!alive) return;
      if (!res.success) {
        showActionError(res, tAlerts);
        setDbs([]);
      } else setDbs(res.data);
    });
    return () => {
      alive = false;
    };
  }, [tAlerts]);

  const run = async () => {
    setBusy(true);
    const res = await importPaymentTemplatesAction({ dbName });
    setBusy(false);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("Imported", res.data));
    onClose();
  };

  return (
    <Modal
      open
      title={t("Import")}
      okText={t("Import")}
      okButtonProps={{ disabled: !dbName }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={run}
    >
      <p className="muted">{t("ImportHint")}</p>
      <Select
        style={{ width: "100%" }}
        loading={dbs === null}
        value={dbName}
        onChange={setDbName}
        placeholder={t("ChooseDb")}
        options={(dbs ?? []).map((d) => ({
          value: d,
          label: <bdi className="mono">{d}</bdi>,
        }))}
      />
    </Modal>
  );
}

// ---------- تطبيق القوالب على شركات مختارة ----------
function ApplyModal({ companies, onClose }) {
  const t = useTranslations("PaymentTemplates");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);

  const run = async () => {
    setBusy(true);
    const res = await applyPaymentTemplatesAction({ ids: selected });
    setBusy(false);
    if (!res.success) return showActionError(res, tAlerts);
    const failed = res.data.results.filter((r) => r.error);
    setResults(res.data.results);
    if (failed.length) message.warning(t("ApplyFailed", { n: failed.length }));
    else {
      message.success(t("Applied", { n: res.data.results.length }));
      onClose();
    }
  };

  return (
    <Modal
      open
      width={720}
      title={t("Apply")}
      okText={t("ApplyRun", { n: selected.length })}
      okButtonProps={{ disabled: !selected.length }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={run}
    >
      <p className="muted">{t("ApplyHint")}</p>
      {results?.some((r) => r.error) && (
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          title={t("ApplyFailed", {
            n: results.filter((r) => r.error).length,
          })}
          description={results
            .filter((r) => r.error)
            .map((r) => (
              <div key={r.id}>
                <bdi className="mono">{r.code}</bdi> — {nm(r)}:{" "}
                {tAlerts(r.error, r.details ?? undefined)}
              </div>
            ))}
        />
      )}
      <Table
        size="small"
        rowKey="id"
        dataSource={companies}
        pagination={false}
        scroll={{ y: 360 }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys),
        }}
        columns={[
          { title: "#", dataIndex: "serialNo", width: 60 },
          {
            title: t("Code"),
            dataIndex: "code",
            width: 110,
            render: (v) => <span className="mono">{v}</span>,
          },
          { title: t("Company"), render: (_, r) => nm(r) },
        ]}
      />
    </Modal>
  );
}
