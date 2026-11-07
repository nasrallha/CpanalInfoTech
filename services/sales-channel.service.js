import "server-only";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { applySalesChannels } from "@/lib/provision";
import { audit } from "./audit.service";

// ============================================================
// تطبيقات التوصيل (هنقرستيشن، جاهز، مرسول...)
// - التطبيق هنا بقيمه الافتراضية (الزيادة على السعر + العمولة)
// - كل شركة بنفعّل عندها اللي محتاجاه بقيمها الخاصة، وبيتكتب في قاعدتها على طول
// - تعديل اسم التطبيق / ترتيبه / إيقافه: بيتطبّق على كل الشركات اللي مفعّلاه
// ============================================================

export const getSalesChannels = async () => {
  const rows = await prisma.salesChannelTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      _count: { select: { companies: { where: { isActive: true } } } },
    },
  });
  return rows.map(({ _count, ...r }) => ({
    ...r,
    companies: _count.companies,
  }));
};

function handleUnique(e) {
  if (e?.code === "P2002") throw new AppError("SalesChannelNameExists");
  throw e;
}

export async function createSalesChannel(data, user) {
  let t;
  try {
    t = await prisma.salesChannelTemplate.create({
      data,
      select: { id: true },
    });
  } catch (e) {
    handleUnique(e);
  }
  await audit(user, "salesChannel.create", { details: { name: data.arName } });
  return t;
}

// القيم الافتراضية بتنفع للشركات الجديدة بس، وقيم كل شركة مابتتغيرش
export async function updateSalesChannel({ id, ...data }, user) {
  try {
    await prisma.salesChannelTemplate.update({ where: { id }, data });
  } catch (e) {
    if (e?.code === "P2025") throw new AppError("NotFound");
    handleUnique(e);
  }
  await audit(user, "salesChannel.update", { details: { name: data.arName } });
  const links = await prisma.companyChannel.findMany({
    where: { templateId: id },
    select: { companyId: true },
  });
  const failed = await syncCompanies(links.map((l) => l.companyId));
  return { id, failed };
}

// التطبيق اللي اتفعّل عند شركة قبل كده مايتمسحش (يتوقف بدل كده)
export async function deleteSalesChannel(id, user) {
  const t = await prisma.salesChannelTemplate.findUnique({
    where: { id },
    select: { arName: true, _count: { select: { companies: true } } },
  });
  if (!t) throw new AppError("NotFound");
  if (t._count.companies) throw new AppError("SalesChannelInUse");
  await prisma.salesChannelTemplate.delete({ where: { id } });
  await audit(user, "salesChannel.delete", { details: { name: t.arName } });
  return { id };
}

// ------------------------------------------------------------
// تطبيقات شركة
// ------------------------------------------------------------
export const getCompanyChannels = (companyId) =>
  prisma.companyChannel.findMany({
    where: { companyId },
    select: {
      templateId: true,
      markupType: true,
      markupValue: true,
      commissionPercent: true,
      isActive: true,
    },
  });

// اللي في القائمة = مفعّل بقيمه، والباقي اللي كان مفعّل بيتقفل (سجله بيفضل)
export async function saveCompanyChannels({ companyId, channels }, user) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: { code: true, provisionedAt: true },
  });
  if (!c) throw new AppError("NotFound");
  if (!c.provisionedAt) throw new AppError("NotProvisioned");
  const ids = channels.map((ch) => ch.templateId);
  if (new Set(ids).size !== ids.length) throw new AppError("NotFound");
  const found = await prisma.salesChannelTemplate.count({
    where: { id: { in: ids } },
  });
  if (found !== ids.length) throw new AppError("NotFound");

  await prisma.$transaction(async (tx) => {
    for (const { templateId, ...v } of channels) {
      await tx.companyChannel.upsert({
        where: { companyId_templateId: { companyId, templateId } },
        create: { companyId, templateId, ...v, isActive: true },
        update: { ...v, isActive: true },
      });
    }
    await tx.companyChannel.updateMany({
      where: { companyId, templateId: { notIn: ids } },
      data: { isActive: false },
    });
  });
  await pushCompanyChannels(companyId);
  await audit(user, "salesChannel.company", {
    companyId,
    details: { code: c.code, count: channels.length },
  });
  return { count: channels.length };
}

// كتابة تطبيقات الشركة في قاعدتها
async function pushCompanyChannels(companyId) {
  const c = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      dbName: true,
      provisionedAt: true,
      channels: { include: { template: true } },
    },
  });
  if (!c?.provisionedAt) throw new AppError("NotProvisioned");
  return applySalesChannels(
    c.dbName,
    c.channels.map((ch) => ({
      templateId: ch.templateId,
      arName: ch.template.arName,
      enName: ch.template.enName,
      sortOrder: ch.template.sortOrder,
      markupType: ch.markupType,
      markupValue: ch.markupValue,
      commissionPercent: ch.commissionPercent,
      isActive: ch.isActive && ch.template.isActive,
    })),
  );
}

// بعد تعديل تطبيق: الشركات اللي فشلت (قاعدتها مش متحدّثة / السيرفر واقف...)
async function syncCompanies(ids) {
  const failed = [];
  for (const id of ids) {
    try {
      await pushCompanyChannels(id);
    } catch {
      failed.push(id);
    }
  }
  if (!failed.length) return [];
  return prisma.company.findMany({
    where: { id: { in: failed } },
    select: { id: true, code: true, arName: true, enName: true },
  });
}
