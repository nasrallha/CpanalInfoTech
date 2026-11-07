"use client";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/common/PageHeader";
import AuditTable from "./AuditTable";

export default function AuditView({ logs }) {
  const t = useTranslations("Audit");
  return (
    <>
      <PageHeader
        title={t("Title")}
        subtitle={t("Latest", { n: logs.length })}
      />
      <AuditTable logs={logs} />
    </>
  );
}
