// سجل العمليات
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getAuditLogs } from "@/services/audit.service";
import AuditView from "@/components/audit/AuditView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess("audit.view");
  if (!allowed) return <NoAccess />;
  await connection();
  const logs = await getAuditLogs({ take: 500 });
  return <AuditView logs={logs} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
