import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { AuthProvider } from "@/components/common/AuthProvider";
import PanelShell from "@/components/layout/PanelShell";
import Loading from "@/components/common/Loading";

// كل صفحات اللوحة: محتاجة دخول، وجوه القائمة الجانبية
export default function PanelLayout({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }) {
  const user = await requireUser();
  return (
    <AuthProvider user={user}>
      <PanelShell>{children}</PanelShell>
    </AuthProvider>
  );
}
