import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { audit } from "./audit.service";

export const getRoles = () =>
  prisma.staffRole.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      arName: true,
      enName: true,
      permissions: true,
      isActive: true,
      _count: { select: { staff: true } },
    },
  });

export async function createRole(data, user) {
  const role = await prisma.staffRole.create({ data, select: { id: true } });
  await audit(user, "role.create", { details: { name: data.arName } });
  return role;
}

export async function updateRole({ id, ...data }, user) {
  await prisma.staffRole.update({ where: { id }, data });
  await audit(user, "role.update", { details: { name: data.arName } });
  return { id };
}

export async function deleteRole(id, user) {
  const role = await prisma.staffRole.findUnique({
    where: { id },
    select: { arName: true, _count: { select: { staff: true } } },
  });
  if (!role) throw new AppError("NotFound");
  if (role._count.staff > 0) throw new AppError("RoleInUse");
  await prisma.staffRole.delete({ where: { id } });
  await audit(user, "role.delete", { details: { name: role.arName } });
  return { id };
}
