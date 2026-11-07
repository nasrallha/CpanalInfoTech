import "server-only";
import { prisma } from "@/lib/prisma";
import { getCompanies } from "./company.service";
import { getSettings } from "./settings.service";
import { today } from "@/lib/dates";

// الرئيسية: عدد الشركات بكل حالة + اللي قربت تخلص + آخر العمليات
export async function getDashboard() {
  const [companies, settings, plans, staff] = await Promise.all([
    getCompanies(),
    getSettings(),
    prisma.plan.count({ where: { isActive: true } }),
    prisma.staff.count({ where: { isActive: true } }),
  ]);
  const counts = {};
  for (const c of companies)
    counts[c.sub.state] = (counts[c.sub.state] ?? 0) + 1;
  const month = today().slice(0, 7);
  return {
    total: companies.length,
    counts,
    newThisMonth: companies.filter(
      (c) => new Date(c.createdAt).toISOString().slice(0, 7) === month,
    ).length,
    attention: companies
      .filter((c) =>
        ["expiring", "grace", "readonly", "expired", "pending"].includes(
          c.sub.state,
        ),
      )
      .sort((a, b) => a.sub.daysLeft - b.sub.daysLeft)
      .slice(0, 20),
    expiringDays: settings.expiringDays,
    plans,
    staff,
  };
}
