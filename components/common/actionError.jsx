"use client";
import { message } from "@/components/common/feedback";
import { applyFieldErrors } from "@/lib/form-errors";

// رسالة خطأ الـ action + (لو فيه form) الأخطاء تحت كل حقل
export function showActionError(res, tAlerts, form) {
  if (form && res?.fieldErrors)
    applyFieldErrors(form, res.fieldErrors, tAlerts);
  const values =
    res?.details &&
    typeof res.details === "object" &&
    !Array.isArray(res.details)
      ? res.details
      : undefined;
  message.error(tAlerts(res?.error ?? "UnexpectedError", values));
}
