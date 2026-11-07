// الباقات
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getPlanFeatures, getPlans } from "@/services/plan.service";
import PlansView from "@/components/plans/PlansView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess("plans.view");
  if (!allowed) return <NoAccess />;
  await connection();
  const [plans, features] = await Promise.all([getPlans(), getPlanFeatures()]);
  return <PlansView plans={plans} features={features} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
