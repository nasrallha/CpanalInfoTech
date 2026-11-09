import "server-only";
import { prisma } from "@/lib/prisma";
import { audit } from "./audit.service";
import { deleteImage, saveImage } from "@/lib/upload";

// إعدادات اللوحة (صف واحد id = 1، بيتعمل أول مرة)
export async function getSettings() {
  return prisma.panelSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function saveSettings(data, user) {
  const saved = await prisma.panelSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  await audit(user, "settings.update", { details: data });
  return saved;
}

// ------------------------------------------------------------
// الصلاحيات المقفولة على العملاء (القايمة العامة لكل الشركات)
// ------------------------------------------------------------
export async function saveClientLocks({ permissions }, user) {
  const { cleanLocks } = await import("@/lib/client-locks");
  const list = await cleanLocks(permissions);
  await prisma.panelSettings.upsert({
    where: { id: 1 },
    create: { id: 1, clientBlockedPermissions: list },
    update: { clientBlockedPermissions: list },
  });
  await audit(user, "settings.clientLocks", { details: { count: list.length } });
  return list;
}

// ------------------------------------------------------------
// بيانات الشركة المالكة (الدعم الفني) + اللوجو
// ------------------------------------------------------------
export async function saveVendor({ logo, removeLogo, ...data }, user) {
  const old = await getSettings();
  const newPath = logo ? await saveImage(logo, "vendor") : null;
  const vendorLogo = newPath ?? (removeLogo ? null : old.vendorLogo);
  try {
    await prisma.panelSettings.update({
      where: { id: 1 },
      data: { ...data, vendorLogo },
    });
  } catch (e) {
    await deleteImage(newPath);
    throw e;
  }
  if (old.vendorLogo && old.vendorLogo !== vendorLogo)
    await deleteImage(old.vendorLogo);
  await audit(user, "settings.vendor", {
    details: { name: data.vendorArName },
  });
  return { ok: true };
}

// الشكل اللي بيتكتب عند العملاء (من غير أي حاجة داخلية)
export function vendorPayload(s) {
  return {
    arName: s.vendorArName ?? null,
    enName: s.vendorEnName ?? null,
    logo: s.vendorLogo ?? null,
    phone: s.vendorPhone ?? null,
    phone2: s.vendorPhone2 ?? null,
    whatsapp: s.vendorWhatsapp ?? null,
    email: s.vendorEmail ?? null,
    website: s.vendorWebsite ?? null,
    addressAr: s.vendorAddressAr ?? null,
    addressEn: s.vendorAddressEn ?? null,
    hoursAr: s.vendorHoursAr ?? null,
    hoursEn: s.vendorHoursEn ?? null,
  };
}
