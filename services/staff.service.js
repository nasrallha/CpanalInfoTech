import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { deleteStaffSessions } from "@/lib/auth";
import { audit } from "./audit.service";

const staffSelect = {
  id: true,
  username: true,
  arName: true,
  enName: true,
  phone: true,
  email: true,
  isOwner: true,
  isActive: true,
  roleId: true,
  lastLoginAt: true,
  createdAt: true,
  role: { select: { id: true, arName: true, enName: true } },
};

export const getStaff = () =>
  prisma.staff.findMany({ orderBy: { id: "asc" }, select: staffSelect });

export async function createStaff(data, user) {
  const { password, ...rest } = data;
  const created = await prisma.staff.create({
    data: {
      ...rest,
      roleId: rest.roleId ?? null,
      passwordHash: await hashPassword(password),
    },
    select: { id: true },
  });
  await audit(user, "staff.create", { details: { username: rest.username } });
  return created;
}

export async function updateStaff(data, user) {
  const { id, password, ...rest } = data;
  const current = await prisma.staff.findUnique({
    where: { id },
    select: { isOwner: true },
  });
  if (!current) throw new AppError("NotFound");
  // صاحب اللوحة: مينفعش يتوقف، ودوره ملوش لازمة
  if (current.isOwner) {
    rest.isActive = true;
    rest.roleId = null;
  }
  await prisma.staff.update({
    where: { id },
    data: {
      ...rest,
      roleId: rest.roleId ?? null,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  // باسورد جديد أو إيقاف: يخرج من كل الأجهزة (ماعدا نفسك لو بتغيّر باسوردك)
  if ((password && id !== user.id) || rest.isActive === false) {
    await deleteStaffSessions([id]);
  }
  await audit(user, "staff.update", {
    details: { username: rest.username, password: Boolean(password) },
  });
  return { id };
}

export async function deleteStaff(id, user) {
  const current = await prisma.staff.findUnique({
    where: { id },
    select: { isOwner: true, username: true },
  });
  if (!current) throw new AppError("NotFound");
  if (current.isOwner || id === user.id)
    throw new AppError("CannotDeleteOwner");
  await prisma.staff.delete({ where: { id } });
  await audit(user, "staff.delete", {
    details: { username: current.username },
  });
  return { id };
}
