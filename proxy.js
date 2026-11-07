// Next.js 16: الـ middleware اسمه proxy
// 1) next-intl: اللغة في الرابط (/ ← /ar)
// 2) فحص سريع: مفيش cookie جلسة ← صفحة الدخول (الفحص الحقيقي في السيرفر مع كل صفحة و action)
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE } from "./lib/session-config";

const intl = createMiddleware(routing);
const PUBLIC_PAGES = ["/login"];

export default function proxy(request) {
  const match = request.nextUrl.pathname.match(/^\/(ar|en)(\/.*)?$/);
  if (match) {
    const [, locale, page = "/"] = match;
    const isPublic = PUBLIC_PAGES.some(
      (p) => page === p || page.startsWith(`${p}/`),
    );
    if (!isPublic && !request.cookies.has(SESSION_COOKIE)) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }
  return intl(request);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*"],
};
