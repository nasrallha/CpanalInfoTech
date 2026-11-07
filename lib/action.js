import "server-only";
import { refresh as refreshPage } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { AppError } from "./errors";
import { getCurrentUser } from "./auth";
import { can } from "./permissions";

// ============================================================
// كل الـ actions بنفس الشكل:
//   نجاح: { success: true, data }   فشل: { success: false, error, details?, fieldErrors? }
// options: { permission, public, refresh }
// ============================================================
export async function runAction(schema, input, handler, options = {}) {
  try {
    let user = null;
    if (!options.public) {
      user = await getCurrentUser();
      if (!user) return { success: false, error: "SessionExpired" };
      if (options.permission && !can(user, options.permission)) {
        return { success: false, error: "Forbidden" };
      }
    }

    let data = input;
    if (schema) {
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path.join(".") || "_";
          if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        }
        return { success: false, error: "ValidationError", fieldErrors };
      }
      data = parsed.data;
    }

    const result = await handler(data, user);
    if (options.refresh) refreshPage();
    return { success: true, data: result ?? null };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.code,
        details: error.details,
        fieldErrors: error.fieldErrors ?? undefined,
      };
    }
    // قيمة مكررة في عمود فريد
    if (error?.code === "P2002") return { success: false, error: "Duplicate" };
    console.error(error);
    return { success: false, error: "UnexpectedError" };
  }
}
