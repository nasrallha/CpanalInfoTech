// شركة جديدة
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getActivePlans } from "@/services/plan.service";
import { getActiveActivities } from "@/services/activity.service";
import { getSettings } from "@/services/settings.service";
import { suggestCompanyCode } from "@/services/company.service";
import NewCompanyForm from "@/components/companies/NewCompanyForm";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ searchParams }) {
  const { allowed } = await getPageAccess("companies.create");
  if (!allowed) return <NoAccess />;
  await connection();
  // ?trial=1 ← شركة تجريبية
  const trial = (await searchParams)?.trial === "1";
  const [plans, activities, settings, suggested] = await Promise.all([
    getActivePlans(),
    getActiveActivities(),
    getSettings(),
    suggestCompanyCode(),
  ]);
  return (
    <NewCompanyForm
      key={`${suggested.code}${trial ? "-t" : ""}`}
      trial={trial}
      plans={plans}
      activities={activities}
      defaults={{
        graceDays: settings.graceDays,
        readonlyDays: settings.readonlyDays,
      }}
      suggested={suggested}
      erpUrl={process.env.ERP_URL ?? ""}
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
