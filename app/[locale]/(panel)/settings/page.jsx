// إعدادات اللوحة
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getSettings } from "@/services/settings.service";
import { secretKeyReady } from "@/lib/secret-box";
import { readMigrations } from "@/lib/provision";
import SettingsView from "@/components/settings/SettingsView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess("settings.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const settings = await getSettings();
  // ملفات جداول البرنامج الأساسي (ERP_MIGRATIONS_DIR)
  let migrations = 0;
  try {
    migrations = readMigrations().length;
  } catch {
    migrations = 0;
  }
  return (
    <SettingsView
      settings={settings}
      status={{
        secretKey: secretKeyReady(),
        erpUrl: process.env.ERP_URL ?? "",
        migrations,
      }}
    />
  );
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
