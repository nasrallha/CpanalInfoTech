"use client";
import { Button } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export default function LanguageSwitcher({ className }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const next = locale === "ar" ? "en" : "ar";
  return (
    <Button
      type="text"
      icon={<GlobalOutlined />}
      onClick={() => router.replace(pathname, { locale: next })}
    >
      {next === "ar" ? "العربية" : "English"}
    </Button>
  );
}
