import { z } from "zod";
import { isDay } from "@/lib/dates";

export const idField = z.number({ error: "RequiredField" }).int().positive();

export const requiredText = (max) =>
  z
    .string({ error: "RequiredField" })
    .trim()
    .min(1, "RequiredField")
    .max(max, "TextTooLong");

// نص اختياري: الفاضي ← null
export const optionalText = (max) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z
      .string()
      .trim()
      .max(max, "TextTooLong")
      .nullish()
      .transform((v) => v ?? null),
  );

export const dayField = z
  .string({ error: "RequiredField" })
  .refine(isDay, "InvalidDate");

// رقم صحيح اختياري (حدود): الفاضي ← null = من غير حد
export const optionalLimit = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.number().int().min(0, "MustBePositive").max(1_000_000).nullable(),
);

export const usernameField = z
  .string({ error: "RequiredField" })
  .trim()
  .min(3, "UsernameMin")
  .max(50, "TextTooLong")
  .regex(/^[A-Za-z0-9._-]+$/, "UsernameInvalid");

export const passwordField = z
  .string({ error: "RequiredField" })
  .min(8, "PasswordMin")
  .max(100, "TextTooLong");
