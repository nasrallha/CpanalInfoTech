import { Suspense } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { routing } from "@/i18n/routing";
import AntdProvider from "@/components/common/AntdProvider";
import { themeCssVars } from "@/theme/colors";
import "../globals.css";

// خط اللوحة: IBM Plex Sans Arabic (عربي وإنجليزي بشكل احترافي)
const mainFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-main",
  display: "swap",
});

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Common" });
  return { title: t("AppName") };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={mainFont.variable}
    >
      <head>
        {/* ألوان اللوحة كمتغيرات CSS (--cp-...) من theme/colors.js */}
        <style dangerouslySetInnerHTML={{ __html: themeCssVars }} />
      </head>
      <body suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <Suspense fallback={null}>
            <AntdRegistry>
              <AntdProvider locale={locale}>{children}</AntdProvider>
            </AntdRegistry>
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
