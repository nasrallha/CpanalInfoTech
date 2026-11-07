// تفاصيل الشركة
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getCompany, getCompanyDbStatus } from "@/services/company.service";
import { getActivePlans, getPlanFeatures } from "@/services/plan.service";
import { getActiveActivities } from "@/services/activity.service";
import { getAuditLogs } from "@/services/audit.service";
import { erpModuleCatalog } from "@/lib/erp-meta";
import CompanyDetails from "@/components/companies/CompanyDetails";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess("companies.view");
  if (!allowed) return <NoAccess />;
  await connection();
  const { id } = await params;
  const companyId = Number(id);
  if (!Number.isInteger(companyId) || companyId <= 0) notFound();
  const [company, plans, activities, logs, features, modules] =
    await Promise.all([
      getCompany(companyId),
      getActivePlans(),
      getActiveActivities(),
      getAuditLogs({ companyId, take: 100 }),
      getPlanFeatures(),
      erpModuleCatalog().catch(() => []),
    ]);
  if (!company) notFound();
  const dbStatus = await getCompanyDbStatus(company);
  return (
    <CompanyDetails
      company={company}
      plans={plans}
      activities={activities}
      logs={logs}
      erpUrl={process.env.ERP_URL ?? ""}
      dbStatus={dbStatus}
      features={features}
      modules={modules}
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
