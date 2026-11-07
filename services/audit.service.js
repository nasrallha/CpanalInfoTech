import "server-only";
import { prisma } from "@/lib/prisma";
import { clientInfo } from "@/lib/auth";

// ============================================================
// سجل العمليات: كل حاجة بتتعمل في اللوحة
// action: مفتاح ترجمة (Audit.actions.<action>)
// ============================================================
export async function audit(
  user,
  action,
  { companyId = null, details = null, db = prisma } = {},
) {
  let ip = null;
  try {
    ip = (await clientInfo()).ip;
  } catch {
    ip = null;
  }
  await db.auditLog.create({
    data: { staffId: user?.id ?? null, companyId, action, details, ip },
  });
}

export async function getAuditLogs({ companyId, staffId, take = 300 } = {}) {
  return prisma.auditLog.findMany({
    where: {
      ...(companyId ? { companyId } : {}),
      ...(staffId ? { staffId } : {}),
    },
    orderBy: { id: "desc" },
    take,
    select: {
      id: true,
      action: true,
      details: true,
      ip: true,
      createdAt: true,
      staff: {
        select: { id: true, arName: true, enName: true, username: true },
      },
      company: { select: { id: true, code: true, arName: true, enName: true } },
    },
  });
}
