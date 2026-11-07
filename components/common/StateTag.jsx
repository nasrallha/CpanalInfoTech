"use client";
import { Tag } from "antd";
import { useTranslations } from "next-intl";
import { SUB_COLORS } from "@/lib/subscription";

// حالة اشتراك الشركة (بلون)
export default function StateTag({ sub }) {
  const t = useTranslations("States");
  if (!sub) return null;
  return <Tag color={SUB_COLORS[sub.state]}>{t(sub.state)}</Tag>;
}
