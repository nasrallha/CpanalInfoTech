// الموظفين
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getStaff } from "@/services/staff.service";
import { getRoles } from "@/services/role.service";
import StaffView from "@/components/staff/StaffView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content({ params }) {
  const { allowed } = await getPageAccess("staff.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const [staff, roles] = await Promise.all([getStaff(), getRoles()]);
  return <StaffView staff={staff} roles={roles} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
