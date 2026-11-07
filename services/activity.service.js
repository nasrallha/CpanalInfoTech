import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { deleteImage, saveImage } from "@/lib/upload";
import { audit } from "./audit.service";
import { cleanModules } from "@/lib/erp-meta";

// الأنشطة: الاسم + صورة شاشة الدخول (background = مسار الصورة جوه uploads)
const IMAGES_FOLDER = "activities";

export const getActivities = () =>
  prisma.activity.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { companies: true } } },
  });

export const getActiveActivities = () =>
  prisma.activity.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });

export async function createActivity({ image, removeImage, ...data }, user) {
  data = { ...data, modules: await cleanModules(data.modules) };
  const background = image ? await saveImage(image, IMAGES_FOLDER) : null;
  try {
    const a = await prisma.activity.create({
      data: { ...data, background },
      select: { id: true },
    });
    await audit(user, "activity.create", { details: { name: data.arName } });
    return a;
  } catch (e) {
    // الحفظ فشل (مثلاً اسم مكرر): نمسح الصورة اللي اترفعت
    await deleteImage(background);
    throw e;
  }
}

export async function updateActivity(
  { id, image, removeImage, ...data },
  user,
) {
  const old = await prisma.activity.findUnique({
    where: { id },
    select: { background: true },
  });
  if (!old) throw new AppError("NotFound");
  data = { ...data, modules: await cleanModules(data.modules) };

  const newPath = image ? await saveImage(image, IMAGES_FOLDER) : null;
  const background = newPath ?? (removeImage ? null : old.background);
  try {
    await prisma.activity.update({
      where: { id },
      data: { ...data, background },
    });
  } catch (e) {
    await deleteImage(newPath);
    throw e;
  }
  // الصورة القديمة اتشالت أو اتبدلت
  if (old.background && old.background !== background)
    await deleteImage(old.background);
  await audit(user, "activity.update", { details: { name: data.arName } });
  // الوحدات بتنزل للشركات اللي على النشاط ده (زي تعديل الباقة)
  return { id, ...(await syncActivityCompanies(id)) };
}

export async function setActivityActive({ id, isActive }, user) {
  const a = await prisma.activity.findUnique({
    where: { id },
    select: { arName: true },
  });
  if (!a) throw new AppError("NotFound");
  await prisma.activity.update({ where: { id }, data: { isActive } });
  await audit(user, isActive ? "activity.activate" : "activity.deactivate", {
    details: { name: a.arName },
  });
  return { id, isActive };
}

export async function deleteActivity(id, user) {
  const a = await prisma.activity.findUnique({
    where: { id },
    select: {
      arName: true,
      background: true,
      _count: { select: { companies: true } },
    },
  });
  if (!a) throw new AppError("NotFound");
  if (a._count.companies > 0) throw new AppError("ActivityInUse");
  await prisma.activity.delete({ where: { id } });
  await deleteImage(a.background);
  await audit(user, "activity.delete", { details: { name: a.arName } });
  return { id };
}

// كل الشركات اللي على النشاط وقاعدتها جاهزة
async function syncActivityCompanies(activityId) {
  const { trySync } = await import("./company.service");
  const rows = await prisma.company.findMany({
    where: { activityId, provisionedAt: { not: null } },
    select: { id: true },
  });
  let failed = 0;
  for (const r of rows) if (!(await trySync(r.id)).synced) failed++;
  return { companies: rows.length, failed };
}
