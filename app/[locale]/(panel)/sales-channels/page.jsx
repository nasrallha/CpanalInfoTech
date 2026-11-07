// تطبيقات التوصيل (هنقرستيشن، جاهز...) وتفعيلها عند الشركات
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getSalesChannels } from "@/services/sales-channel.service";
import { prisma } from "@/lib/prisma";
import SalesChannelsView from "@/components/sales-channels/SalesChannelsView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content() {
  const { allowed } = await getPageAccess("salesChannels.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const [channels, companies] = await Promise.all([
    getSalesChannels(),
    prisma.company.findMany({
      where: { provisionedAt: { not: null } },
      orderBy: { serialNo: "asc" },
      select: {
        id: true,
        serialNo: true,
        code: true,
        arName: true,
        enName: true,
      },
    }),
  ]);
  return <SalesChannelsView channels={channels} companies={companies} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
