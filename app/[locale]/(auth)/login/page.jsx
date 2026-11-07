// صفحة الدخول (أول مرة: إنشاء صاحب اللوحة)
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAnyStaff } from "@/services/auth.service";
import LoginScreen from "@/components/auth/LoginScreen";

async function Content() {
  await connection();
  if (await getCurrentUser()) {
    redirect({ href: "/", locale: await getLocale() });
  }
  const needsSetup = !(await hasAnyStaff());
  return <LoginScreen needsSetup={needsSetup} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Content />
    </Suspense>
  );
}
