"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
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
import PermissionPicker from "./PermissionPicker";
import {
  applyTemplatesAction,
  createRoleTemplateAction,
  deleteRoleTemplateAction,
  importRolesAction,
  importableDatabasesAction,
  resetTemplateRoleAction,
  templateStatusAction,
  updateRoleTemplateAction,
} from "@/actions/role-template.actions";

// ============================================================
// قوالب الأدوار: أدوار ثابتة بتنزل عند الشركات (مقفولة عند العميل)
// - شركة جديدة: بتنزل لوحدها مع "إنشاء القاعدة"
// - أي تعديل بعد كده: "تطبيق على الشركات" وتختار الشركات
// ============================================================
export default function RoleTemplatesView({ templates, meta, companies }) {
  const t = useTranslations("RoleTemplates");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [importOpen, setImportOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const crud = useCrud({
    create: createRoleTemplateAction,
    update: updateRoleTemplateAction,
    remove: deleteRoleTemplateAction,
    toForm: (r) => ({
      arName: r.arName,
      enName: r.enName,
      isActive: r.isActive,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
    }),
  });
  const req = [
    { required: true, whitespace: true, message: tAlerts("RequiredField") },
  ];
  const total = meta?.all?.length ?? 0;

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
              disabled={!meta}
              onClick={() => crud.openNew({ isActive: true, permissions: [] })}
            >
              {t("New")}
            </Button>
          </Space>
        }
      />
      {!meta && (
        <Alert
          type="error"
          showIcon
          className="mb-4"
          title={tAlerts("ErpPermissionsMissing")}
        />
      )}
      <Alert type="info" showIcon className="mb-4" title={t("Note")} />

      <Table
        rowKey="id"
        dataSource={templates}
        pagination={false}
        scroll={{ x: 600 }}
        columns={[
          { title: t("Name"), render: (_, r) => <b>{nm(r)}</b> },
          {
            title: t("Permissions"),
            render: (_, r) => (
              <Tag className="cp-chip">
                {(r.permissions ?? []).length} / {total || "?"}
              </Tag>
            ),
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
                onEdit={meta ? () => crud.openEdit(r) : undefined}
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
        width={860}
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
            <PermissionPicker meta={meta} />
          </Form.Item>
        </Form>
      </Modal>

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {applyOpen && (
        <ApplyModal
          companies={companies}
          templates={templates}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </>
  );
}

// ---------- استيراد الأدوار من قاعدة (زي FirstPos) ----------
function ImportModal({ onClose }) {
  const t = useTranslations("RoleTemplates");
  const tAlerts = useTranslations("Alerts");
  const [dbs, setDbs] = useState(null);
  const [dbName, setDbName] = useState(null);
  const [busy, setBusy] = useState(false);

  // القواعد اللي فيها أدوار (مرة واحدة لما النافذة تتفتح)
  useEffect(() => {
    let alive = true;
    importableDatabasesAction().then((res) => {
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
    const res = await importRolesAction({ dbName });
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
// - حالة كل دور عند كل شركة: مطابق / متعدّل للشركة / محتاج تحديث / مش موجود
// - الطريقة: «حدّث المطابق وسيب المتعدّل» (الافتراضي) أو «طبّق على الكل» (بتأكيد)
// - «رجّع للقالب» لدور متعدّل عند شركة واحدة
const STATUS_COLOR = {
  same: "green",
  customized: "orange",
  outdated: "blue",
  missing: "default",
};

function ApplyModal({ companies, templates, onClose }) {
  const t = useTranslations("RoleTemplates");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState(null);
  const [mode, setMode] = useState("keep");
  // { [companyId]: { [templateId]: status } | { error } } (null = بيحمّل)
  const [status, setStatus] = useState(null);
  const [resetting, setResetting] = useState(null);

  const loadStatus = (ids) =>
    templateStatusAction({ ids }).then((res) => {
      if (!res.success) {
        showActionError(res, tAlerts);
        return;
      }
      setStatus((prev) => ({ ...(prev ?? {}), ...res.data }));
    });

  // حالة القوالب عند كل الشركات (مرة واحدة لما النافذة تتفتح)
  useEffect(() => {
    let alive = true;
    templateStatusAction({ ids: companies.map((c) => c.id) }).then((res) => {
      if (!alive) return;
      if (!res.success) {
        showActionError(res, tAlerts);
        setStatus({});
      } else setStatus(res.data);
    });
    return () => {
      alive = false;
    };
  }, [companies, tAlerts]);

  const runApply = async () => {
    setBusy(true);
    const res = await applyTemplatesAction({ ids: selected, mode });
    setBusy(false);
    if (!res.success) return showActionError(res, tAlerts);
    const failed = res.data.results.filter((r) => r.error);
    const skipped = res.data.results.reduce((n, r) => n + (r.skipped ?? 0), 0);
    setResults(res.data.results);
    if (failed.length) message.warning(t("ApplyFailed", { n: failed.length }));
    else
      message.success(
        skipped
          ? t("AppliedSkipped", { n: res.data.results.length, skipped })
          : t("Applied", { n: res.data.results.length }),
      );
    loadStatus(selected);
  };

  // «طبّق على الكل» بيمسح تعديلات الشركات ← تأكيد قبله
  const run = () => {
    if (mode !== "all") return runApply();
    Modal.confirm({
      title: t("ConfirmAllTitle"),
      content: t("ConfirmAll"),
      okText: t("ApplyRun", { n: selected.length }),
      okButtonProps: { danger: true },
      onOk: runApply,
    });
  };

  const reset = async (companyId, templateId) => {
    setResetting(`${companyId}:${templateId}`);
    const res = await resetTemplateRoleAction({ companyId, templateId });
    setResetting(null);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("ResetDone"));
    loadStatus([companyId]);
  };

  const cell = (c, tpl) => {
    const st = status?.[c.id];
    if (!st) return <span className="muted">…</span>;
    if (st.error) return <Tag color="red">{tAlerts(st.error)}</Tag>;
    const v = st[tpl.id] ?? "missing";
    return (
      <Space size={4} wrap>
        <Tag color={STATUS_COLOR[v]}>{t(`status.${v}`)}</Tag>
        {v === "customized" && (
          <Popconfirm
            title={t("ResetConfirm")}
            okText={t("ResetToTemplate")}
            onConfirm={() => reset(c.id, tpl.id)}
          >
            <Button
              size="small"
              type="link"
              loading={resetting === `${c.id}:${tpl.id}`}
            >
              {t("ResetToTemplate")}
            </Button>
          </Popconfirm>
        )}
      </Space>
    );
  };

  return (
    <Modal
      open
      width={1000}
      title={t("Apply")}
      okText={t("ApplyRun", { n: selected.length })}
      okButtonProps={{ disabled: !selected.length, danger: mode === "all" }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={run}
    >
      <p className="muted">{t("ApplyHint")}</p>
      <Radio.Group
        className="mb-3"
        value={mode}
        onChange={(e) => setMode(e.target.value)}
      >
        <Space orientation="vertical">
          <Radio value="keep">
            <b>{t("ModeKeep")}</b>{" "}
            <span className="muted">— {t("ModeKeepHint")}</span>
          </Radio>
          <Radio value="all">
            <b>{t("ModeAll")}</b>{" "}
            <span className="muted">— {t("ModeAllHint")}</span>
          </Radio>
        </Space>
      </Radio.Group>
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
        loading={status === null}
        scroll={{ x: 360 + templates.length * 170, y: 360 }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => setSelected(keys),
        }}
        columns={[
          {
            title: t("Code"),
            dataIndex: "code",
            width: 100,
            fixed: "start",
            render: (v) => <span className="mono">{v}</span>,
          },
          {
            title: t("Company"),
            width: 180,
            fixed: "start",
            render: (_, r) => nm(r),
          },
          ...templates.map((tpl) => ({
            title: nm(tpl),
            key: `t${tpl.id}`,
            width: 170,
            render: (_, c) => cell(c, tpl),
          })),
        ]}
      />
    </Modal>
  );
}
