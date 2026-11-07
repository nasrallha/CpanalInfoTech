// تحديث قواعد الشركات: تختار الشركات ولحد أنهي تحديث
import { Suspense } from "react";
import { connection } from "next/server";
import { getPageAccess } from "@/lib/auth";
import { getUpdatesOverview } from "@/services/company.service";
import UpdatesView from "@/components/updates/UpdatesView";
import NoAccess from "@/components/common/NoAccess";
import Loading from "@/components/common/Loading";

async function Content() {
  const { allowed } = await getPageAccess("companies.provision");
  if (!allowed) return <NoAccess />;
  await connection();
  let data;
  try {
    data = await getUpdatesOverview();
  } catch {
    data = { migrations: [], companies: [], missing: true };
  }
  return <UpdatesView {...data} />;
}

export default function Page(props) {
  return (
    <Suspense fallback={<Loading />}>
      <Content {...props} />
    </Suspense>
  );
}
