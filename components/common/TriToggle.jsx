"use client";

import {
  CheckCircleFilled,
  CloseCircleFilled,
  LinkOutlined,
} from "@ant-design/icons";

// ============================================================
// اختيار من 3 (حسب الباقة / مفعّلة / مقفلة) بأزرار ملوّنة واضحة
// value: "plan" | "on" | "off"
// ============================================================
const ICONS = {
  plan: <LinkOutlined />,
  on: <CheckCircleFilled />,
  off: <CloseCircleFilled />,
};

export default function TriToggle({ value, onChange, labels, disabled }) {
  return (
    <div className="tri" role="radiogroup">
      {["plan", "on", "off"].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          className={`tri__btn tri__btn--${v}${value === v ? " is-active" : ""}`}
          onClick={() => value !== v && onChange?.(v)}
        >
          {ICONS[v]}
          <span>{labels[v]}</span>
        </button>
      ))}
    </div>
  );
}
