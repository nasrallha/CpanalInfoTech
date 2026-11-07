// قوالب طرق الدفع
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getPaymentTemplates } from "@/services/payment-template.service";
import { prisma } from "@/lib/prisma";
import PaymentTemplatesView from "@/components/payment-templates/PaymentTemplatesView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content() {
  const { allowed } = await getPageAccess("paymentTemplates.manage");
  if (!allowed) return <NoAccess />;
  await connection();
  const [templates, companies] = await Promise.all([
    getPaymentTemplates(),
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
  return <PaymentTemplatesView templates={templates} companies={companies} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
