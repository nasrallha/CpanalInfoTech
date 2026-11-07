import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/routing";
import { SESSION_COOKIE, SESSION_HOURS } from "@/lib/session-config";
import { can } from "@/lib/permissions";

// ============================================================
// جلسات موظفي اللوحة
// - الـ cookie فيها رقم عشوائي طويل، وقاعدة البيانات فيها الـ hash بتاعه بس
// ============================================================
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

// عنوان IP بشكل مقروء:
// "::1" (الجهاز نفسه بـ IPv6) ← 127.0.0.1 ، "::ffff:1.2.3.4" ← 1.2.3.4
function normalizeIp(ip) {
  if (!ip) return null;
  const v = ip.trim();
  if (v === "::1") return "127.0.0.1";
  const m = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(v);
  return m ? m[1] : v;
}

export async function clientInfo() {
  const h = await headers();
  const ip = normalizeIp(
    h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || null,
  );
  return {
    ip: ip?.slice(0, 64) ?? null,
    userAgent: h.get("user-agent")?.slice(0, 255) ?? null,
  };
}

export async function createSession(staffId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  const { ip, userAgent } = await clientInfo();
  await prisma.staffSession.create({
    data: { tokenHash: hashToken(token), staffId, ip, userAgent, expiresAt },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.staffSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }
  store.delete(SESSION_COOKIE);
}

export async function deleteStaffSessions(staffIds) {
  await prisma.staffSession.deleteMany({
    where: { staffId: { in: staffIds } },
  });
}

// الموظف الحالي (مرة واحدة لكل طلب)
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.staffSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      staff: {
        select: {
          id: true,
          username: true,
          arName: true,
          enName: true,
          isOwner: true,
          isActive: true,
          role: {
            select: {
              id: true,
              arName: true,
              enName: true,
              isActive: true,
              permissions: true,
            },
          },
        },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.staffSession
      .delete({ where: { id: session.id } })
      .catch(() => {});
    return null;
  }
  const { staff } = session;
  if (!staff.isActive) return null;
  if (!staff.isOwner && staff.role && !staff.role.isActive) return null;
  return {
    id: staff.id,
    username: staff.username,
    arName: staff.arName,
    enName: staff.enName,
    isOwner: staff.isOwner,
    role: staff.role
      ? {
          id: staff.role.id,
          arName: staff.role.arName,
          enName: staff.role.enName,
        }
      : null,
    permissions: Array.isArray(staff.role?.permissions)
      ? staff.role.permissions
      : [],
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }
  return user;
}

// للصفحات: const { user, allowed } = await getPageAccess("companies.view")
export async function getPageAccess(permission) {
  const user = await requireUser();
  return { user, allowed: permission ? can(user, permission) : true };
}
