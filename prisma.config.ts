// إعداد Prisma 7: مكان الـ schema والـ migrations ورابط قاعدة بيانات لوحة التحكم
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
