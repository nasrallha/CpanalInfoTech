"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
  Upload,
} from "antd";
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  ClearOutlined,
  DeleteOutlined,
  HddOutlined,
  RollbackOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/components/common/AuthProvider";
import { useLocale, useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import { showActionError } from "@/components/common/actionError";
import { message } from "@/components/common/feedback";
import { formatDateTime } from "@/lib/dates";
import {
  backupCompaniesAction,
  backupPanelAction,
  deleteBackupAction,
  deleteBackupsAction,
  restoreCompanyAction,
  restorePanelAction,
  savePanelBackupScheduleAction,
} from "@/actions/backup.actions";
import { C } from "@/theme/colors";

// فولدر نسخ قاعدة اللوحة نفسها
const PANEL = "_panel";

const fmtSize = (n) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

// ============================================================
// نسخ احتياطي لقواعد الشركات: تختار شركة أو أكتر، أو الكل
// (النسخ التلقائي لكل شركة بيفضل من جوه البرنامج نفسه، بمواعيدها)
// ============================================================
export default function BackupsView({ companies, backups, schedule }) {
  const t = useTranslations("Backups");
  const tc = useTranslations("Common");
  const { can } = useAuth();
  const canRestore = can("backups.restore");
  const canRestorePanel = can("backups.restorePanel");
  const [restoring, setRestoring] = useState(null);
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const nm = (x) => (locale === "ar" ? x.arName : x.enName);
  const [selected, setSelected] = useState([]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const byCode = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.code, c])),
    [companies],
  );
  // آخر نسخة لكل شركة
  const lastOf = useMemo(() => {
    const m = {};
    for (const f of backups.files) if (!m[f.code]) m[f.code] = f;
    return m;
  }, [backups.files]);

  const run = async (ids) => {
    setRunning(true);
    const res = await backupCompaniesAction({ ids });
    setRunning(false);
    if (!res.success) return showActionError(res, tAlerts);
    setResults(res.data.results);
    setSelected([]);
    const failed = res.data.results.filter((r) => r.error).length;
    if (failed) message.warning(t("Failed", { n: failed }));
    else message.success(t("Done", { n: res.data.results.length }));
  };

  const remove = async (f) => {
    const res = await deleteBackupAction({ code: f.code, name: f.name });
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("Deleted"));
  };

  // ---------- حذف مجموعة ملفات ----------
  // فلتر بالشركة (أو قاعدة اللوحة) + تحديد ملفات
  const [owner, setOwner] = useState(null);
  const [picked, setPicked] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const keyOf = (f) => `${f.code}/${f.name}`;
  const shown = useMemo(
    () => (owner ? backups.files.filter((f) => f.code === owner) : backups.files),
    [backups.files, owner],
  );
  // القديم: كل الملفات ما عدا آخر نسخة لكل شركة (الملفات مترتبة الأحدث الأول)
  const older = useMemo(() => {
    const seen = new Set();
    return shown.filter((f) => (seen.has(f.code) ? true : (seen.add(f.code), false)));
  }, [shown]);
  const pickedFiles = shown.filter((f) => picked.includes(keyOf(f)));
  const sizeOf = (list) => fmtSize(list.reduce((s, f) => s + f.size, 0));
  const ownerOptions = useMemo(() => {
    const codes = [...new Set(backups.files.map((f) => f.code))];
    return codes.map((c) => ({
      value: c,
      label:
        c === PANEL ? t("PanelDb") : byCode[c] ? `${c} — ${nm(byCode[c])}` : c,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backups.files, byCode, locale]);

  const removeMany = async (list) => {
    if (!list.length) return;
    setDeleting(true);
    const res = await deleteBackupsAction({
      files: list.map((f) => ({ code: f.code, name: f.name })),
    });
    setDeleting(false);
    if (!res.success) return showActionError(res, tAlerts);
    setPicked([]);
    message.success(
      t("DeletedMany", { n: res.data.deleted, size: fmtSize(res.data.size) }),
    );
  };

  return (
    <>
      <PageHeader title={t("Title")} subtitle={t("Subtitle")} />
      <Alert
        type="info"
        showIcon
        className="mb-4"
        title={t("Note")}
        description={
          <span>
            {t("Folder")}: <bdi className="mono">{backups.root}</bdi>
          </span>
        }
      />

      <PanelCard schedule={schedule} />

      {(canRestore || canRestorePanel) && (
        <UploadCard
          companies={companies}
          canRestore={canRestore}
          canRestorePanel={canRestorePanel}
        />
      )}

      <Card size="small" className="mb-4">
        <Space wrap>
          <Popconfirm
            title={t("ConfirmAll", { n: companies.length })}
            onConfirm={() => run(companies.map((c) => c.id))}
            disabled={!companies.length}
          >
            <Button
              type="primary"
              icon={<DatabaseOutlined />}
              loading={running}
              disabled={!companies.length}
            >
              {t("BackupAll", { n: companies.length })}
            </Button>
          </Popconfirm>
          <Button
            icon={<DatabaseOutlined />}
            loading={running}
            disabled={!selected.length}
            onClick={() => run(selected)}
          >
            {t("BackupSelected", { n: selected.length })}
          </Button>
          <span className="muted">{t("Slow")}</span>
        </Space>
      </Card>

      {results?.some((r) => r.error) && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          title={t("Failed", { n: results.filter((r) => r.error).length })}
          description={results
            .filter((r) => r.error)
            .map((r) => (
              <div key={r.id}>
                <bdi className="mono">{r.code}</bdi> — {nm(r)}:{" "}
                <bdi>{r.details?.message}</bdi>
              </div>
            ))}
        />
      )}

      <Card size="small" title={t("Companies")} className="mb-4">
        <Table
          size="small"
          rowKey="id"
          dataSource={companies}
          pagination={false}
          scroll={{ x: 700 }}
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
            {
              title: t("Database"),
              dataIndex: "dbName",
              render: (v) => <bdi className="mono">{v}</bdi>,
            },
            {
              title: t("LastBackup"),
              render: (_, r) =>
                lastOf[r.code] ? (
                  <bdi>{formatDateTime(lastOf[r.code].createdAt, locale)}</bdi>
                ) : (
                  <Tag>{t("Never")}</Tag>
                ),
            },
          ]}
        />
      </Card>

      <Card
        size="small"
        title={`${t("Files")} (${shown.length} · ${sizeOf(shown)})`}
      >
        <div className="cp-filters mb-3">
          <Space wrap>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 300, maxWidth: "100%" }}
              placeholder={t("AllOwners")}
              value={owner}
              onChange={(v) => {
                setOwner(v ?? null);
                setPicked([]);
              }}
              options={ownerOptions}
            />
            <Popconfirm
              title={t("DeleteSelectedConfirm", { n: pickedFiles.length })}
              okButtonProps={{ danger: true }}
              onConfirm={() => removeMany(pickedFiles)}
              disabled={!pickedFiles.length}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                loading={deleting}
                disabled={!pickedFiles.length}
              >
                {t("DeleteSelected", { n: pickedFiles.length })}
                {pickedFiles.length ? ` (${sizeOf(pickedFiles)})` : ""}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t("KeepLatestConfirm", { n: older.length })}
              description={t("KeepLatestHint")}
              okButtonProps={{ danger: true }}
              onConfirm={() => removeMany(older)}
              disabled={!older.length}
            >
              <Button
                icon={<ClearOutlined />}
                loading={deleting}
                disabled={!older.length}
              >
                {t("KeepLatest", { n: older.length })}
              </Button>
            </Popconfirm>
            <Popconfirm
              title={t("DeleteAllConfirm", { n: shown.length })}
              description={owner ? undefined : t("DeleteAllHint")}
              okButtonProps={{ danger: true }}
              onConfirm={() => removeMany(shown)}
              disabled={!shown.length}
            >
              <Button
                danger
                type="primary"
                icon={<DeleteOutlined />}
                loading={deleting}
                disabled={!shown.length}
              >
                {t("DeleteAllShown", { n: shown.length })}
              </Button>
            </Popconfirm>
          </Space>
        </div>
        <Table
          size="small"
          rowKey={keyOf}
          dataSource={shown}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          scroll={{ x: 800 }}
          rowSelection={{
            selectedRowKeys: picked,
            onChange: (keys) => setPicked(keys),
            // تحديد كل الملفات (مش الصفحة بس)
            selections: [
              Table.SELECTION_ALL,
              Table.SELECTION_INVERT,
              Table.SELECTION_NONE,
            ],
          }}
          columns={[
            {
              title: t("Company"),
              render: (_, f) =>
                f.code === PANEL ? (
                  <Tag className="cp-chip" icon={<HddOutlined />}>
                    {t("PanelDb")}
                  </Tag>
                ) : byCode[f.code] ? (
                  nm(byCode[f.code])
                ) : (
                  <span className="mono">{f.code}</span>
                ),
            },
            {
              title: t("File"),
              dataIndex: "name",
              render: (v) => <bdi className="mono">{v}</bdi>,
            },
            {
              title: t("Size"),
              dataIndex: "size",
              render: fmtSize,
              width: 100,
            },
            {
              title: t("Date"),
              dataIndex: "createdAt",
              render: (v) => <bdi>{formatDateTime(v, locale)}</bdi>,
            },
            {
              title: "",
              width: 160,
              render: (_, f) => (
                <Space>
                  {/* ملف شركة مش موجودة هنا: الاسترجاع على شركة تختارها */}
                  {(f.code === PANEL
                    ? canRestorePanel
                    : canRestore && companies.length > 0) && (
                    <Button
                      size="small"
                      icon={<RollbackOutlined />}
                      title={t("Restore")}
                      aria-label={t("Restore")}
                      onClick={() => setRestoring(f)}
                    />
                  )}
                  <Button
                    size="small"
                    icon={<CloudDownloadOutlined />}
                    title={tc("Download")}
                    aria-label={tc("Download")}
                    href={`/api/backups/${f.code}/${encodeURIComponent(f.name)}`}
                  />
                  <Popconfirm
                    title={t("DeleteConfirm")}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => remove(f)}
                  >
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      title={tc("Delete")}
                      aria-label={tc("Delete")}
                    />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {restoring && (
        <RestoreModal
          file={restoring}
          company={byCode[restoring.code]}
          companies={companies}
          onClose={() => setRestoring(null)}
        />
      )}
    </>
  );
}

// ============================================================
// قاعدة اللوحة: نسخة دلوقتي + النسخ التلقائي كل يوم
// ============================================================
function PanelCard({ schedule }) {
  const t = useTranslations("Backups");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    panelBackupEnabled: schedule?.panelBackupEnabled ?? true,
    panelBackupTime: schedule?.panelBackupTime ?? "03:00",
    panelBackupKeep: schedule?.panelBackupKeep ?? 14,
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const backupNow = async () => {
    setBusy(true);
    const res = await backupPanelAction();
    setBusy(false);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("PanelDone"));
  };
  const save = async () => {
    setSaving(true);
    const res = await savePanelBackupScheduleAction(form);
    setSaving(false);
    if (!res.success) return showActionError(res, tAlerts);
    message.success(t("ScheduleSaved"));
  };

  return (
    <Card
      size="small"
      className="mb-4"
      title={
        <span>
          <HddOutlined /> {t("PanelDb")}
        </span>
      }
    >
      <div className="muted mb-3">{t("PanelNote")}</div>
      <Space wrap align="center" size={[12, 12]}>
        <Button
          type="primary"
          icon={<DatabaseOutlined />}
          loading={busy}
          onClick={backupNow}
        >
          {t("PanelBackupNow")}
        </Button>
        <span>
          <Switch
            checked={form.panelBackupEnabled}
            onChange={(v) => set({ panelBackupEnabled: v })}
          />{" "}
          {t("AutoDaily")}
        </span>
        <TimePicker
          format="HH:mm"
          minuteStep={5}
          needConfirm={false}
          allowClear={false}
          disabled={!form.panelBackupEnabled}
          value={dayjs(`2000-01-01T${form.panelBackupTime}`)}
          onChange={(d) => d && set({ panelBackupTime: d.format("HH:mm") })}
          style={{ width: 110 }}
        />
        <InputNumber
          min={1}
          max={365}
          precision={0}
          disabled={!form.panelBackupEnabled}
          prefix={t("Keep")}
          suffix={t("Copies")}
          value={form.panelBackupKeep}
          onChange={(v) => set({ panelBackupKeep: v ?? 14 })}
          style={{ width: 200 }}
        />
        <Button icon={<SaveOutlined />} loading={saving} onClick={save}>
          {t("SaveSchedule")}
        </Button>
      </Space>
      {schedule?.panelBackupLastAt && (
        <div className="mt-3">
          {t("LastAuto")}:{" "}
          <bdi>{formatDateTime(schedule.panelBackupLastAt, locale)}</bdi>{" "}
          {schedule.panelBackupLastOk ? (
            <Tag color="green">{t("Ok")}</Tag>
          ) : (
            <Tag color="red" title={schedule.panelBackupLastError ?? ""}>
              {t("Failed", { n: 1 })}
            </Tag>
          )}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// رفع ملف نسخة من الجهاز (لشركة أو للوحة) ← يظهر في الملفات ويتسترجع منها
// ============================================================
function UploadCard({ companies, canRestore, canRestorePanel }) {
  const t = useTranslations("Backups");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const router = useRouter();
  const [code, setCode] = useState(null);
  const [uploading, setUploading] = useState(false);
  const options = [
    ...(canRestorePanel ? [{ value: PANEL, label: t("PanelDb") }] : []),
    ...(canRestore
      ? companies.map((c) => ({
          value: c.code,
          label: `${c.code} — ${locale === "ar" ? c.arName : c.enName}`,
        }))
      : []),
  ];

  const upload = async (file) => {
    setUploading(true);
    try {
      const res = await fetch(
        `/api/backups/upload?code=${encodeURIComponent(code)}`,
        {
          method: "POST",
          headers: { "x-file-name": encodeURIComponent(file.name) },
          body: file,
        },
      ).then((r) => r.json());
      if (!res.success) return showActionError(res, tAlerts);
      message.success(t("Uploaded"));
      router.refresh();
    } catch {
      message.error(tAlerts("UploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card
      size="small"
      className="mb-4"
      title={
        <span>
          <CloudUploadOutlined /> {t("UploadTitle")}
        </span>
      }
    >
      <div className="muted mb-3">{t("UploadNote")}</div>
      <Space wrap>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: 320 }}
          placeholder={t("UploadFor")}
          value={code}
          onChange={setCode}
          options={options}
        />
        <Upload
          accept=".sql"
          showUploadList={false}
          disabled={!code || uploading}
          beforeUpload={(file) => {
            upload(file);
            return false;
          }}
        >
          <Button
            icon={<CloudUploadOutlined />}
            loading={uploading}
            disabled={!code}
          >
            {t("UploadFile")}
          </Button>
        </Upload>
      </Space>
    </Card>
  );
}

// ============================================================
// تأكيد الاسترجاع: لازم يكتب كود الشركة (أو PANEL للوحة)
// - ملف لشركة مش موجودة هنا (من جهاز تاني): تختار الشركة اللي يترجع عليها
// ============================================================
function RestoreModal({ file, company, companies, onClose }) {
  const t = useTranslations("Backups");
  const tAlerts = useTranslations("Alerts");
  const locale = useLocale();
  const panel = file.code === PANEL;
  const orphan = !panel && !company;
  const [targetId, setTargetId] = useState(company?.id ?? null);
  const target = company ?? companies.find((x) => x.id === targetId);
  const word = panel ? "PANEL" : (target?.code ?? "");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const run = async () => {
    setBusy(true);
    const res = panel
      ? await restorePanelAction({ name: file.name, confirm })
      : await restoreCompanyAction({
          id: target.id,
          name: file.name,
          confirm,
          from: orphan ? file.code : null,
        });
    setBusy(false);
    if (!res.success) return showActionError(res, tAlerts);
    setDone(res.data);
    message.success(t("Restored"));
  };

  return (
    <Modal
      open
      width={620}
      title={
        <span>
          <RollbackOutlined /> {t("RestoreTitle")}
        </span>
      }
      onCancel={onClose}
      mask={{ closable: false }}
      footer={
        done ? (
          <Button type="primary" onClick={onClose}>
            {t("Close")}
          </Button>
        ) : (
          <Space>
            <Button onClick={onClose}>{t("Cancel")}</Button>
            <Button
              type="primary"
              danger
              icon={<RollbackOutlined />}
              loading={busy}
              disabled={!word || confirm.trim().toUpperCase() !== word}
              onClick={run}
            >
              {t("RestoreNow")}
            </Button>
          </Space>
        )
      }
    >
      <div className="mb-3">
        <b>
          {panel
            ? t("PanelDb")
            : orphan
              ? file.code
              : `${file.code} — ${locale === "ar" ? company.arName : company.enName}`}
        </b>
        <div className="mono muted">
          <bdi>{file.name}</bdi> ·{" "}
          <bdi>{formatDateTime(file.createdAt, locale)}</bdi>
        </div>
      </div>
      {done ? (
        <Alert
          type="success"
          showIcon
          title={t("Restored")}
          description={
            <>
              <div>
                {t("SafetyCopy")}: <bdi className="mono">{done.safety}</bdi>
              </div>
              {done.migrated > 0 && (
                <div>{t("Migrated", { n: done.migrated })}</div>
              )}
              {!done.migrateOk && (
                <div style={{ color: C.danger }}>{t("MigrateFailed")}</div>
              )}
              {done.zatcaGap > 0 && (
                <div>{t("ZatcaGap", { n: done.zatcaGap })}</div>
              )}
              {panel && <div>{t("PanelRestoredNote")}</div>}
            </>
          }
        />
      ) : (
        <>
          <Alert
            type="warning"
            showIcon
            className="mb-3"
            title={panel ? t("PanelRestoreWarn") : t("RestoreWarn")}
            description={
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                <li>{t("RestoreStep1")}</li>
                {!panel && <li>{t("RestoreStep2")}</li>}
                <li>{t("RestoreStep3")}</li>
                {!panel && <li>{t("RestoreStep4")}</li>}
                {!panel && <li>{t("RestoreStep5")}</li>}
              </ul>
            }
          />
          {orphan && (
            <>
              <Alert type="info" showIcon className="mb-3" title={t("OrphanRestoreHint")} />
              <div className="mb-2">{t("RestoreInto")}</div>
              <Select
                className="mb-3"
                showSearch
                optionFilterProp="label"
                style={{ width: "100%" }}
                placeholder={t("ChooseCompany")}
                value={targetId}
                onChange={(v) => {
                  setTargetId(v);
                  setConfirm("");
                }}
                options={companies.map((x) => ({
                  value: x.id,
                  label: `${x.code} — ${locale === "ar" ? x.arName : x.enName}`,
                }))}
              />
            </>
          )}
          {word && <div className="mb-2">{t("TypeToConfirm", { word })}</div>}
          <Input
            autoFocus
            dir="ltr"
            className="mono"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!word}
            onPressEnter={() =>
              word && confirm.trim().toUpperCase() === word && !busy && run()
            }
          />
        </>
      )}
    </Modal>
  );
}
