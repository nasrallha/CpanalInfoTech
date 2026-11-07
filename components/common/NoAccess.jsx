"use client";
import { Button, Result } from "antd";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function NoAccess() {
  const t = useTranslations("Common");
  return (
    <Result
      status="403"
      title={t("NoAccessTitle")}
      subTitle={t("NoAccessText")}
      extra={
        <Link href="/">
          <Button type="primary">{t("BackHome")}</Button>
        </Link>
      }
    />
  );
}
