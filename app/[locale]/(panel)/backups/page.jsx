// النسخ الاحتياطي لقواعد الشركات
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getPanelBackupSchedule,
  listPanelBackups,
} from "@/services/backup.service";
import BackupsView from "@/components/backups/BackupsView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content() {
  const { allowed } = await getPageAccess("backups.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const [companies, backups, schedule] = await Promise.all([
    prisma.company.findMany({
      where: { provisionedAt: { not: null } },
      orderBy: { serialNo: "asc" },
      select: {
        id: true,
        serialNo: true,
        code: true,
        arName: true,
        enName: true,
        status: true,
        dbName: true,
      },
    }),
    listPanelBackups(),
    getPanelBackupSchedule(),
  ]);
  return (
    <BackupsView companies={companies} backups={backups} schedule={schedule} />
  );
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
