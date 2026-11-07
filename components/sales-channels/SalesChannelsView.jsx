"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
} from "antd";
import { PlusOutlined, ShopOutlined } from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import RowActions from "@/components/common/RowActions";
import { useCrud } from "@/components/common/useCrud";
import { showActionError } from "@/components/common/actionError";
import { message, modal } from "@/components/common/feedback";
import { formatMoney, moneyInputProps } from "@/lib/money";
import {
  companyChannelsAction,
  createSalesChannelAction,
  deleteSalesChannelAction,
  saveCompanyChannelsAction,
  updateSalesChannelAction,
} from "@/actions/sales-channel.actions";

const MARKUP_TYPES = ["percent", "amount"];

// عرض الزيادة: 10% أو 5 (مبلغ)
function MarkupText({ type, value }) {
  const t = useTranslations("SalesChannels");
  if (!Number(value)) return <span className="muted">{t("NoMarkup")}</span>;
  return type === "percent" ? (
    <bdi>{formatMoney(value)}%</bdi>
  ) : (
    <span>
      <bdi>{formatMoney(value)}</bdi> {t("PerItem")}
    </span>
  );
}

// ============================================================
// تطبيقات التوصيل (هنقرستيشن، جاهز، مرسول...)
// - التطبيق هنا بقيمه الافتراضية: الزيادة على السعر (نسبة أو مبلغ) + العمولة
// - «تطبيقات شركة»: تختار الشركة وتفعّل عندها اللي محتاجاه بقيمها الخاصة
// ============================================================
export default function SalesChannelsView({ channels, companies }) {
  const t = useTranslations("SalesChannels");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [companyOpen, setCompanyOpen] = useState(false);

  const crud = useCrud({
    create: createSalesChannelAction,
    update: updateSalesChannelAction,
    remove: deleteSalesChannelAction,
    toForm: (r) => ({
      arName: r.arName,
      enName: r.enName,
      markupType: r.markupType,
      markupValue: r.markupValue,
      commissionPercent: r.commissionPercent,
      sortOrder: r.sortOrder,
      isActive: r.isActive,
    }),
    // شركات مااتطبّقش عندها التعديل (قاعدتها مش متحدّثة / واقفة)
    onSaved: (d) => {
      if (!d?.failed?.length) return;
      modal.warning({
        title: t("SyncFailed", { n: d.failed.length }),
        content: d.failed.map((c) => (
          <div key={c.id}>
            <bdi className="mono">{c.code}</bdi> — {nm(c)}
          </div>
        )),
      });
    },
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
              icon={<ShopOutlined />}
              onClick={() => setCompanyOpen(true)}
              disabled={!channels.length || !companies.length}
            >
              {t("CompanyChannels")}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                crud.openNew({
                  markupType: "percent",
                  markupValue: 0,
                  commissionPercent: 0,
                  sortOrder: (channels.at(-1)?.sortOrder ?? 0) + 1,
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
        dataSource={channels}
        pagination={false}
        scroll={{ x: 720 }}
        columns={[
          { title: t("SortOrder"), dataIndex: "sortOrder", width: 80 },
          { title: t("Name"), render: (_, r) => <b>{nm(r)}</b> },
          {
            title: t("Markup"),
            render: (_, r) => (
              <MarkupText type={r.markupType} value={r.markupValue} />
            ),
          },
          {
            title: t("Commission"),
            dataIndex: "commissionPercent",
            render: (v) => (Number(v) ? <bdi>{formatMoney(v)}%</bdi> : "—"),
          },
          {
            title: t("Companies"),
            dataIndex: "companies",
            width: 110,
            render: (v) =>
              v ? <Tag className="cp-chip">{v}</Tag> : <span>—</span>,
          },
          {
            title: t("Status"),
            dataIndex: "isActive",
            width: 100,
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
        width={680}
        destroyOnHidden
      >
        {crud.isEdit && (
          <Alert
            type="info"
            showIcon
            className="mb-3"
            title={t("EditNote")}
          />
        )}
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
            <MarkupFields />
            <Col xs={12} sm={6}>
              <Form.Item
                name="sortOrder"
                label={t("SortOrder")}
                tooltip={t("SortOrderHint")}
              >
                <InputNumber min={0} max={999} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
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

      {companyOpen && (
        <CompanyChannelsModal
          channels={channels}
          companies={companies}
          onClose={() => setCompanyOpen(false)}
        />
      )}
    </>
  );
}

// نوع الزيادة + قيمتها + العمولة (جوه Form)
function MarkupFields() {
  const t = useTranslations("SalesChannels");
  const type = Form.useWatch("markupType");
  return (
    <>
      <Col xs={12} sm={6}>
        <Form.Item
          name="markupType"
          label={t("MarkupType")}
          tooltip={t("MarkupHint")}
        >
          <Select
            options={MARKUP_TYPES.map((v) => ({
              value: v,
              label: t(`markup.${v}`),
            }))}
          />
        </Form.Item>
      </Col>
      <Col xs={12} sm={6}>
        <Form.Item name="markupValue" label={t("MarkupValue")}>
          <InputNumber
            {...moneyInputProps}
            max={type === "percent" ? 100 : undefined}
            suffix={type === "percent" ? "%" : undefined}
          />
        </Form.Item>
      </Col>
      <Col xs={12} sm={6}>
        <Form.Item
          name="commissionPercent"
          label={t("Commission")}
          tooltip={t("CommissionHint")}
        >
          <InputNumber {...moneyInputProps} max={100} suffix="%" />
        </Form.Item>
      </Col>
    </>
  );
}

// ---------- تطبيقات شركة: تختار الشركة وتفعّل اللي محتاجاه بقيمها ----------
function CompanyChannelsModal({ channels, companies, onClose }) {
  const t = useTranslations("SalesChannels");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [companyId, setCompanyId] = useState(null);
  // { [templateId]: { on, markupType, markupValue, commissionPercent } }
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  // قيم الشركة (أو الافتراضية للتطبيق اللي مااتفعّلش عندها قبل كده)
  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    companyChannelsAction({ companyId }).then((res) => {
      if (!alive) return;
      if (!res.success) {
        showActionError(res, tAlerts);
        setRows({});
        return;
      }
      const saved = new Map(res.data.map((r) => [r.templateId, r]));
      setRows(
        Object.fromEntries(
          channels.map((ch) => {
            const s = saved.get(ch.id);
            return [
              ch.id,
              {
                on: Boolean(s?.isActive),
                markupType: s?.markupType ?? ch.markupType,
                markupValue: s?.markupValue ?? ch.markupValue,
                commissionPercent:
                  s?.commissionPercent ?? ch.commissionPercent,
              },
            ];
          }),
        ),
      );
    });
    return () => {
      alive = false;
    };
  }, [companyId, channels, tAlerts]);

  const pickCompany = (id) => {
    setRows(null);
    setCompanyId(id);
  };
  const set = (id, patch) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: c.id,
        label: `${c.serialNo} · ${c.code} — ${nm(c)}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companies, locale],
  );
  const onCount = rows ? Object.values(rows).filter((r) => r.on).length : 0;

  const save = async () => {
    const list = Object.entries(rows)
      .filter(([, r]) => r.on)
      .map(([id, r]) => ({
        templateId: Number(id),
        markupType: r.markupType,
        markupValue: Number(r.markupValue) || 0,
        commissionPercent: Number(r.commissionPercent) || 0,
      }));
    setBusy(true);
    const res = await saveCompanyChannelsAction({
      companyId,
      channels: list,
    });
    setBusy(false);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("CompanySaved", { n: res.data.count }));
    onClose();
  };

  return (
    <Modal
      open
      width={860}
      title={t("CompanyChannels")}
      okText={t("SaveCompany", { n: onCount })}
      okButtonProps={{ disabled: !companyId || !rows }}
      confirmLoading={busy}
      onCancel={onClose}
      onOk={save}
    >
      <p className="muted">{t("CompanyHint")}</p>
      <Select
        showSearch
        optionFilterProp="label"
        style={{ width: "100%" }}
        className="mb-3"
        value={companyId}
        onChange={pickCompany}
        placeholder={t("ChooseCompany")}
        options={companyOptions}
      />
      {!companyId ? (
        <Empty description={t("ChooseCompanyFirst")} />
      ) : !rows ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <Table
          size="small"
          rowKey="id"
          dataSource={channels}
          pagination={false}
          scroll={{ x: 640, y: 380 }}
          columns={[
            {
              title: t("Enabled"),
              width: 80,
              render: (_, ch) => (
                <Switch
                  size="small"
                  checked={rows[ch.id]?.on}
                  onChange={(on) => set(ch.id, { on })}
                />
              ),
            },
            {
              title: t("Name"),
              render: (_, ch) => (
                <Space size={4}>
                  <b>{nm(ch)}</b>
                  {!ch.isActive && <Tag>{t("Inactive")}</Tag>}
                </Space>
              ),
            },
            {
              title: t("MarkupType"),
              width: 130,
              render: (_, ch) => (
                <Select
                  size="small"
                  style={{ width: "100%" }}
                  disabled={!rows[ch.id]?.on}
                  value={rows[ch.id]?.markupType}
                  onChange={(markupType) => set(ch.id, { markupType })}
                  options={MARKUP_TYPES.map((v) => ({
                    value: v,
                    label: t(`markup.${v}`),
                  }))}
                />
              ),
            },
            {
              title: t("MarkupValue"),
              width: 130,
              render: (_, ch) => {
                const r = rows[ch.id];
                return (
                  <InputNumber
                    {...moneyInputProps}
                    size="small"
                    disabled={!r?.on}
                    max={r?.markupType === "percent" ? 100 : undefined}
                    suffix={r?.markupType === "percent" ? "%" : undefined}
                    value={r?.markupValue}
                    onChange={(markupValue) => set(ch.id, { markupValue })}
                  />
                );
              },
            },
            {
              title: t("Commission"),
              width: 120,
              render: (_, ch) => (
                <InputNumber
                  {...moneyInputProps}
                  size="small"
                  max={100}
                  suffix="%"
                  disabled={!rows[ch.id]?.on}
                  value={rows[ch.id]?.commissionPercent}
                  onChange={(commissionPercent) =>
                    set(ch.id, { commissionPercent })
                  }
                />
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
