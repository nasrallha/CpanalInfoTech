// الشركات التجريبية (تاب لوحدها: نفس شاشة الشركات بالتجريبي بس)
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getCompanies } from "@/services/company.service";
import CompaniesView from "@/components/companies/CompaniesView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content() {
  const { allowed } = await getPageAccess("companies.view");
  if (!allowed) return <NoAccess />;
  await connection();
  const companies = await getCompanies({ trial: true });
  return <CompaniesView companies={companies} trial />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
