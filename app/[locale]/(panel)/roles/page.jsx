// أدوار الموظفين وصلاحياتهم
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getRoles } from "@/services/role.service";
import RolesView from "@/components/roles/RolesView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess("staff.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const roles = await getRoles();
  return <RolesView roles={roles} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
