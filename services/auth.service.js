import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { DUMMY_HASH, hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteCurrentSession } from "@/lib/auth";
import { audit } from "./audit.service";

// أول تشغيل: مفيش أي موظف ← شاشة إنشاء صاحب اللوحة
export async function hasAnyStaff() {
  return (await prisma.staff.count()) > 0;
}

export async function setupOwner(data) {
  if (await hasAnyStaff()) throw new AppError("AlreadySetUp");
  const staff = await prisma.staff.create({
    data: {
      username: data.username,
      arName: data.arName,
      enName: data.enName,
      passwordHash: await hashPassword(data.password),
      isOwner: true,
    },
    select: { id: true },
  });
  await createSession(staff.id);
  await audit({ id: staff.id }, "staff.setup");
  return { id: staff.id };
}

export async function login({ username, password }) {
  const staff = await prisma.staff.findUnique({
    where: { username: username.trim() },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
      isOwner: true,
      role: { select: { isActive: true } },
    },
  });
  // نفس الوقت تقريباً سواء الاسم موجود ولا لأ
  const ok = await verifyPassword(password, staff?.passwordHash ?? DUMMY_HASH);
  if (!staff || !ok) {
    await audit(null, "login.failed", {
      details: { username: username.slice(0, 50) },
    });
    throw new AppError("InvalidCredentials");
  }
  if (
    !staff.isActive ||
    (!staff.isOwner && staff.role && !staff.role.isActive)
  ) {
    throw new AppError("AccountDisabled");
  }
  await prisma.staff.update({
    where: { id: staff.id },
    data: { lastLoginAt: new Date() },
  });
  await createSession(staff.id);
  await audit({ id: staff.id }, "login");
  return { id: staff.id };
}

export async function logout() {
  await deleteCurrentSession();
}
