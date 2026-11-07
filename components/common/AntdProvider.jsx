"use client";

import { useEffect } from "react";
import { App, ConfigProvider } from "antd";
import { setMessageInstance, setModalInstance } from "./feedback";
import { useNoAutofill } from "./useNoAutofill";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { antdTheme } from "@/theme/antd";

// ============================================================
// إعدادات antd لكل البرنامج
// - direction: الاتجاه (عربي = من اليمين لليسار) حتى تكون الأيقونات وأزرار
//   البحث والحقول المجمّعة في مكانها الصحيح ومتناسقة
// - locale: نصوص antd الداخلية (التقويم، الجداول، النوافذ) بلغة البرنامج
// - theme: الألوان والأحجام الموحدة (ارتفاع الحقول والأزرار، الخط، الحواف)
// ============================================================

// الألوان في theme/colors.js، وثيم antd في theme/antd.js

export default function AntdProvider({ locale, children }) {
  // مفيش اقتراحات من المتصفح في أي حقل (الاسم، الجوال، الضريبي ...)
  useNoAutofill();
  return (
    <ConfigProvider
      direction={locale === "ar" ? "rtl" : "ltr"}
      locale={locale === "ar" ? arEG : enUS}
      theme={antdTheme}
    >
      {/* App: يربط رسائل التنبيه بالثيم والاتجاه (انظر feedback.js) */}
      <App component={false}>
        <MessageBridge />
        {children}
      </App>
    </ConfigProvider>
  );
}

// يسلّم نسخة الرسائل المربوطة بالثيم لـ feedback.js
function MessageBridge() {
  const { message, modal } = App.useApp();
  useEffect(() => {
    setMessageInstance(message);
    setModalInstance(modal);
    return () => {
      setMessageInstance(null);
      setModalInstance(null);
    };
  }, [message, modal]);
  return null;
}
