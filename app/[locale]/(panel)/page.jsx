// الرئيسية
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getDashboard } from "@/services/dashboard.service";
import DashboardView from "@/components/dashboard/DashboardView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess(null);
  if (!allowed) return <NoAccess />;
  await connection();
  const data = await getDashboard();
  return <DashboardView data={data} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
