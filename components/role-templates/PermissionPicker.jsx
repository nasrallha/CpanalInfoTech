"use client";

import { Checkbox, Col, Row } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { C } from "@/theme/colors";

// ============================================================
// اختيار الصلاحيات (صلاحيات البرنامج الأساسي، من غير صلاحيات المالك)
// value: ["sales.pos", ...] | onChange(list)
// meta: { groups: [{ key, actions }], labels: { ar/en: { groups, actions } } }
// ============================================================
export default function PermissionPicker({ value = [], onChange, meta }) {
  const t = useTranslations("RoleTemplates");
  const locale = useLocale();
  const labels = meta?.labels?.[locale] ?? { groups: {}, actions: {} };
  const selected = new Set(value);
  const all = meta?.all ?? [];

  const set = (list) => onChange?.([...new Set(list)]);
  const groupPerms = (g) => g.actions.map((a) => `${g.key}.${a}`);

  const toggleGroup = (g, checked) => {
    const perms = groupPerms(g);
    set(
      checked ? [...value, ...perms] : value.filter((p) => !perms.includes(p)),
    );
  };

  return (
    <div>
      <div className="mb-3">
        <Checkbox
          checked={all.length > 0 && all.every((p) => selected.has(p))}
          indeterminate={value.length > 0 && !all.every((p) => selected.has(p))}
          onChange={(e) => set(e.target.checked ? all : [])}
        >
          <b>{t("SelectAll")}</b>
        </Checkbox>
        <span className="muted" style={{ marginInlineStart: 8 }}>
          {t("SelectedCount", { n: value.length, total: all.length })}
        </span>
      </div>
      <div
        style={{
          maxHeight: 420,
          overflow: "auto",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 8,
        }}
      >
        {(meta?.groups ?? []).map((g) => {
          const perms = groupPerms(g);
          const count = perms.filter((p) => selected.has(p)).length;
          return (
            <Row
              key={g.key}
              gutter={8}
              style={{ padding: "6px 4px", borderBottom: `1px solid ${C.tableBorder}` }}
            >
              <Col xs={24} md={7}>
                <Checkbox
                  checked={count === perms.length}
                  indeterminate={count > 0 && count < perms.length}
                  onChange={(e) => toggleGroup(g, e.target.checked)}
                >
                  <b>{labels.groups[g.key] ?? g.key}</b>
                </Checkbox>
              </Col>
              <Col xs={24} md={17}>
                <Checkbox.Group
                  value={perms.filter((p) => selected.has(p))}
                  onChange={(list) =>
                    set([...value.filter((p) => !perms.includes(p)), ...list])
                  }
                  options={g.actions.map((a) => ({
                    value: `${g.key}.${a}`,
                    label: labels.actions[a] ?? a,
                  }))}
                />
              </Col>
            </Row>
          );
        })}
      </div>
    </div>
  );
}
