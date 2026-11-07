"use server";
import { runAction } from "@/lib/action";
import {
  companyChannelsSchema,
  companyIdSchema,
  createSalesChannelSchema,
  idSchema,
  updateSalesChannelSchema,
} from "@/validations/schemas";
import {
  createSalesChannel,
  deleteSalesChannel,
  getCompanyChannels,
  saveCompanyChannels,
  updateSalesChannel,
} from "@/services/sales-channel.service";

// تطبيقات التوصيل
const PERM = "salesChannels.manage";
const opts = { permission: PERM, refresh: true };

export const createSalesChannelAction = async (input) =>
  runAction(
    createSalesChannelSchema,
    input,
    (d, u) => createSalesChannel(d, u),
    opts,
  );
export const updateSalesChannelAction = async (input) =>
  runAction(
    updateSalesChannelSchema,
    input,
    (d, u) => updateSalesChannel(d, u),
    opts,
  );
export const deleteSalesChannelAction = async (input) =>
  runAction(idSchema, input, (d, u) => deleteSalesChannel(d.id, u), opts);

// تطبيقات شركة معيّنة (قراءة، وحفظ مع الكتابة في قاعدتها)
export const companyChannelsAction = async (input) =>
  runAction(companyIdSchema, input, (d) => getCompanyChannels(d.companyId), {
    permission: PERM,
  });
export const saveCompanyChannelsAction = async (input) =>
  runAction(
    companyChannelsSchema,
    input,
    (d, u) => saveCompanyChannels(d, u),
    opts,
  );
