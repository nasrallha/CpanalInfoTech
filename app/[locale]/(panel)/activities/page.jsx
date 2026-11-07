// الأنشطة
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getActivities } from "@/services/activity.service";
import { erpModuleCatalog } from "@/lib/erp-meta";
import ActivitiesView from "@/components/activities/ActivitiesView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess("activities.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const [activities, modules] = await Promise.all([
    getActivities(),
    erpModuleCatalog().catch(() => []),
  ]);
  return <ActivitiesView activities={activities} modules={modules} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
