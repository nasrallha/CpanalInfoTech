// قوالب الأدوار
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getRoleTemplates } from "@/services/role-template.service";
import { erpPermissions } from "@/lib/erp-meta";
import { prisma } from "@/lib/prisma";
import RoleTemplatesView from "@/components/role-templates/RoleTemplatesView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content() {
  const { allowed } = await getPageAccess("roleTemplates.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const [templates, meta, companies] = await Promise.all([
    getRoleTemplates(),
    erpPermissions().catch((e) => {
      console.error("[role-templates] permissions:", e?.message ?? e);
      return null;
    }),
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
      },
    }),
  ]);
  return (
    <RoleTemplatesView
      templates={templates}
      meta={meta}
      companies={companies}
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
