// ============================================================
// تجهيز قاعدة بيانات الشركة (provisioning)
// 1) CREATE DATABASE + مستخدم MySQL خاص بالشركة (صلاحياته على قاعدتها بس)
// 2) الجداول: ملفات migrations بتاعة البرنامج الأساسي (ERP_MIGRATIONS_DIR)
//    بتتسجل في _prisma_migrations بنفس طريقة Prisma بالظبط،
//    فبعد كده "prisma migrate deploy" يعرف إيه اللي اتعمل
// 3) البيانات الأساسية: دور مدير النظام + الفرع الرئيسي + مدير الشركة + بيانات الشركة
//
// بيستخدم اتصال لوحة التحكم (DATABASE_URL)، والمستخدم ده لازم يكون معاه
// صلاحية CREATE / CREATE USER / GRANT (ALL PRIVILEGES ... WITH GRANT OPTION)
// ============================================================
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import mariadb from "mariadb";
import { dbConfig } from "./db-config";
import { AppError } from "./errors";
import { hashPassword } from "./password";

const DB_NAME_RE = /^[a-z][a-z0-9_]{2,47}$/;
const DB_USER_RE = /^[A-Za-z0-9_]{3,32}$/;

// الهوست بتاع مستخدم MySQL للشركة (البرنامج والقاعدة على نفس السيرفر)
const userHost = () => process.env.DB_USER_HOST || "localhost";

// ------------------------------------------------------------
// ملفات migrations (بالترتيب): [{ name, sql, checksum }]
// ------------------------------------------------------------
export function readMigrations() {
  const dir = process.env.ERP_MIGRATIONS_DIR;
  if (!dir || !fs.existsSync(dir)) throw new AppError("MigrationsDirMissing");
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        fs.existsSync(path.join(dir, d.name, "migration.sql")),
    )
    .map((d) => d.name)
    .sort()
    .map((name) => {
      const buf = fs.readFileSync(path.join(dir, name, "migration.sql"));
      return {
        name,
        sql: buf.toString("utf8"),
        // نفس checksum بتاع Prisma: sha256 لمحتوى الملف
        checksum: createHash("sha256").update(buf).digest("hex"),
      };
    });
}

// اتصال بصلاحيات اللوحة (من غير قاعدة، أو على قاعدة معينة)
async function connect(database) {
  const cfg = dbConfig();
  try {
    return await mariadb.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      allowPublicKeyRetrieval: true,
      connectTimeout: 8000,
      multipleStatements: true,
      ...(database ? { database } : {}),
    });
  } catch (e) {
    throw new AppError("ProvisionFailed", { message: e?.message ?? "Unknown" });
  }
}

const MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
  \`id\` VARCHAR(36) NOT NULL PRIMARY KEY,
  \`checksum\` VARCHAR(64) NOT NULL,
  \`finished_at\` DATETIME(3) NULL,
  \`migration_name\` VARCHAR(255) NOT NULL,
  \`logs\` TEXT NULL,
  \`rolled_back_at\` DATETIME(3) NULL,
  \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`applied_steps_count\` INTEGER UNSIGNED NOT NULL DEFAULT 0
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;

// ------------------------------------------------------------
// تطبيق الـ migrations الناقصة على قاعدة مفتوحة
// بيرجّع أسماء اللي اتطبقت. أي فشل ← يتسجل في _prisma_migrations ويقف
// ------------------------------------------------------------
async function applyPending(conn, migrations) {
  await conn.query(MIGRATIONS_TABLE);
  const rows = await conn.query(
    "SELECT migration_name, finished_at, rolled_back_at FROM `_prisma_migrations`",
  );
  const failed = rows.find((r) => !r.finished_at && !r.rolled_back_at);
  if (failed)
    throw new AppError("MigrationFailed", {
      migration: failed.migration_name,
    });
  const done = new Set(
    rows.filter((r) => r.finished_at).map((r) => r.migration_name),
  );

  const applied = [];
  for (const m of migrations) {
    if (done.has(m.name)) continue;
    const id = randomUUID();
    await conn.query(
      "INSERT INTO `_prisma_migrations` (id, checksum, migration_name, started_at, applied_steps_count) VALUES (?, ?, ?, NOW(3), 0)",
      [id, m.checksum, m.name],
    );
    try {
      await conn.query(m.sql);
    } catch (e) {
      await conn.query(
        "UPDATE `_prisma_migrations` SET logs = ? WHERE id = ?",
        [String(e?.message ?? e).slice(0, 5000), id],
      );
      throw new AppError("MigrationFailed", {
        migration: m.name,
        message: e?.message,
      });
    }
    await conn.query(
      "UPDATE `_prisma_migrations` SET finished_at = NOW(3), applied_steps_count = 1 WHERE id = ?",
      [id],
    );
    applied.push(m.name);
  }
  return applied;
}

// ------------------------------------------------------------
// هل قاعدة بالاسم ده موجودة على السيرفر؟
// ------------------------------------------------------------
export async function databaseExists(dbName) {
  const conn = await connect();
  try {
    const rows = await conn.query(
      "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
      [dbName],
    );
    return rows.length > 0;
  } finally {
    await conn.end();
  }
}

// ------------------------------------------------------------
// البيانات الأساسية (زي شاشة "إعداد النظام لأول مرة" في البرنامج)
// بتتعمل مرة واحدة: لو فيه مستخدم (غير المالك) مبتتعملش تاني
// ------------------------------------------------------------
async function seed(conn, c, adminPassword) {
  const [{ n }] = await conn.query(
    "SELECT COUNT(*) AS n FROM `users` WHERE `isOwner` = false",
  );
  if (Number(n) > 0) return false;

  const passwordHash = await hashPassword(adminPassword);

  await conn.beginTransaction();
  try {
    // دور مدير النظام
    let [role] = await conn.query(
      "SELECT id FROM `roles` WHERE `isSuper` = true AND `isOwner` = false ORDER BY id LIMIT 1",
    );
    if (!role) {
      const r = await conn.query(
        "INSERT INTO `roles` (arName, enName, isSuper, isActive, updatedAt) VALUES ('مدير النظام', 'System Admin', true, true, NOW(3))",
      );
      role = { id: Number(r.insertId) };
    }

    // الفرع الرئيسي (على المستودع الرئيسي)
    let [branch] = await conn.query(
      "SELECT id FROM `branches` WHERE `isActive` = true ORDER BY id LIMIT 1",
    );
    if (!branch) {
      const [wh] = await conn.query(
        "SELECT id FROM `warehouses` WHERE `isMain` = true ORDER BY id LIMIT 1",
      );
      const b = await conn.query(
        "INSERT INTO `branches` (arName, enName, address, warehouseId, updatedAt) VALUES ('الفرع الرئيسي', 'Main Branch', '-', ?, NOW(3))",
        [wh?.id ?? null],
      );
      branch = { id: Number(b.insertId) };
    }

    // مدير الشركة
    await conn.query(
      "INSERT INTO `users` (username, arFullname, enFullname, password, roleId, branchId, updatedAt) VALUES (?, 'مدير النظام', 'System Admin', ?, ?, ?, NOW(3))",
      [c.adminUsername, passwordHash, role.id, branch.id],
    );

    await writeCompanyRow(conn, c);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw new AppError("ProvisionFailed", { message: e?.message ?? "Unknown" });
  }
  return true;
}

// ------------------------------------------------------------
// بيانات الشركة جوه قاعدتها (جدول company): الاسم والضريبي والسجل والعنوان الوطني
// - وقت التجهيز، وكمان لما بيانات الشركة تتعدل في اللوحة
// - الخانة الفاضية في اللوحة مش بتمسح اللي متسجل في البرنامج
// ------------------------------------------------------------
async function writeCompanyRow(conn, c) {
  const digits = (v) => (v && /^\d{15}$/.test(v) ? v : null);
  const cut = (v, n) => (v ? String(v).slice(0, n) : null);
  // بيانات الشركة (تظهر في الفواتير، ويقدر يعدّلها من البرنامج)
  // رقم المنشأة: سجل تجاري ← registrationNo، والباقي ← معرّف البائع (الزكاة)
  const crn = c.idType === "CRN" && /^\d{1,10}$/.test(c.idNumber ?? "");
  const scheme =
    c.idType === "700" ? "700" : crn || !c.idNumber ? "CRN" : "OTH";
  const fixed = (v, n) => (v && new RegExp(`^\\d{${n}}$`).test(v) ? v : null);
  const cols = new Set(
    (
      await conn.query(
        "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'company'",
      )
    ).map((r) => r.c),
  );
  const values = {
    arName: cut(c.arName, 255),
    enName: cut(c.enName, 255),
    taxNo: digits(c.taxNo),
    phone: cut(c.phone, 20),
    email: cut(c.email, 100),
    city: cut(c.city, 100),
    district: cut(c.district, 100),
    street: cut(c.street, 100),
    buildingNo: fixed(c.buildingNo, 4),
    additionalNo: fixed(c.additionalNo, 4),
    postalCode: fixed(c.postalCode, 5),
    registrationNo: crn ? c.idNumber : null,
    sellerIdScheme: scheme,
    sellerIdNumber: !crn && c.idNumber ? cut(c.idNumber, 30) : null,
  };
  // الأعمدة الموجودة فعلاً في القاعدة بس
  const names = Object.keys(values).filter((k) => cols.has(k));
  await conn.query(
    `INSERT INTO \`company\` (id, ${names.map((n) => `\`${n}\``).join(", ")}, updatedAt)
     VALUES (1, ${names.map(() => "?").join(", ")}, NOW(3))
     ON DUPLICATE KEY UPDATE ${names
       .map((n) =>
         n === "arName" || n === "enName" || n === "sellerIdScheme"
           ? `\`${n}\` = VALUES(\`${n}\`)`
           : `\`${n}\` = COALESCE(VALUES(\`${n}\`), \`${n}\`)`,
       )
       .join(", ")}, updatedAt = NOW(3)`,
    names.map((n) => values[n]),
  );
}

// ------------------------------------------------------------
// تجهيز كامل لشركة جديدة
// c: { dbName, dbUser, dbPassword, adminUsername, arName, enName, ... }
// fresh: القاعدة لسه متجهزتش قبل كده ← لو موجودة من محاولة فاشلة تتمسح وتتعمل من الأول
// ------------------------------------------------------------
export async function provisionDatabase(c, adminPassword, { fresh }) {
  if (!DB_NAME_RE.test(c.dbName) || !DB_USER_RE.test(c.dbUser))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  if (!adminPassword) throw new AppError("AdminPasswordMissing");
  const migrations = readMigrations();

  const conn = await connect();
  try {
    const host = userHost();
    if (fresh) {
      if (c.dbName.toLowerCase() === String(dbConfig().database).toLowerCase())
        throw new AppError("ProtectedDatabase");
      await conn.query(`DROP DATABASE IF EXISTS \`${c.dbName}\``);
    }
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${c.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.query("CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?", [
      c.dbUser,
      host,
      c.dbPassword,
    ]);
    await conn.query("ALTER USER ?@? IDENTIFIED BY ?", [
      c.dbUser,
      host,
      c.dbPassword,
    ]);
    await conn.query(`GRANT ALL PRIVILEGES ON \`${c.dbName}\`.* TO ?@?`, [
      c.dbUser,
      host,
    ]);
    await conn.query(`USE \`${c.dbName}\``);
    const applied = await applyPending(conn, migrations);
    const seeded = await seed(conn, c, adminPassword);
    return { applied: applied.length, total: migrations.length, seeded };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("ProvisionFailed", { message: e?.message ?? "Unknown" });
  } finally {
    await conn.end();
  }
}

// ------------------------------------------------------------
// كتابة نسخة الاشتراك جوه قاعدة الشركة (جدولين subscription + subscription_log)
// sub: صف الاشتراك | logs: سجل الاشتراك كله (بيتكتب من جديد كل مرة)
// ------------------------------------------------------------
export async function writeSubscription(dbName, sub, logs) {
  if (!DB_NAME_RE.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const conn = await connect(dbName);
  try {
    const [t] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('subscription', 'subscription_log')",
      [dbName],
    );
    // القاعدة ناقصها تحديث الجداول اللي فيه جداول الاشتراك
    if (Number(t.n) < 2) throw new AppError("SubscriptionTablesMissing");
    // أعمدة اتضافت في تحديثات أحدث: لو مش موجودة نكمّل من غيرها
    const optCols = new Set(
      (
        await conn.query(
          "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'subscription' AND COLUMN_NAME IN ('vendor', 'maxProducts', 'modules', 'staffTitle')",
          [dbName],
        )
      ).map((r) => r.c),
    );
    const hasVendor = optCols.has("vendor");

    await conn.beginTransaction();
    try {
      await conn.query(
        `INSERT INTO \`subscription\` (id, companyCode, companySerial, status, suspendReason,
           planArName, planEnName, features, maxUsers, maxBranches, maxInvoicesMonth,
           startsAt, endsAt, graceDays, readonlyDays, expiringDays, syncedAt)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
         ON DUPLICATE KEY UPDATE companyCode = VALUES(companyCode),
           companySerial = VALUES(companySerial), status = VALUES(status),
           suspendReason = VALUES(suspendReason), planArName = VALUES(planArName),
           planEnName = VALUES(planEnName), features = VALUES(features),
           maxUsers = VALUES(maxUsers), maxBranches = VALUES(maxBranches),
           maxInvoicesMonth = VALUES(maxInvoicesMonth), startsAt = VALUES(startsAt),
           endsAt = VALUES(endsAt), graceDays = VALUES(graceDays),
           readonlyDays = VALUES(readonlyDays), expiringDays = VALUES(expiringDays),
           syncedAt = NOW(3)`,
        [
          sub.companyCode,
          sub.companySerial,
          sub.status,
          sub.suspendReason,
          sub.planArName,
          sub.planEnName,
          sub.features == null ? null : JSON.stringify(sub.features),
          sub.maxUsers,
          sub.maxBranches,
          sub.maxInvoicesMonth,
          sub.startsAt,
          sub.endsAt,
          sub.graceDays,
          sub.readonlyDays,
          sub.expiringDays,
        ],
      );
      if (optCols.has("maxProducts"))
        await conn.query(
          "UPDATE `subscription` SET maxProducts = ? WHERE id = 1",
          [sub.maxProducts ?? null],
        );
      if (optCols.has("modules"))
        await conn.query("UPDATE `subscription` SET modules = ? WHERE id = 1", [
          JSON.stringify(Array.isArray(sub.modules) ? sub.modules : []),
        ]);
      if (optCols.has("staffTitle"))
        await conn.query(
          "UPDATE `subscription` SET staffTitle = ? WHERE id = 1",
          [sub.staffTitle ?? null],
        );
      if (hasVendor)
        await conn.query("UPDATE `subscription` SET vendor = ? WHERE id = 1", [
          sub.vendor == null ? null : JSON.stringify(sub.vendor),
        ]);
      await conn.query("DELETE FROM `subscription_log`");
      if (logs.length) {
        await conn.batch(
          "INSERT INTO `subscription_log` (id, action, planArName, planEnName, startsAt, endsAt, amount, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          logs.map((l) => [
            l.id,
            l.action,
            l.planArName,
            l.planEnName,
            l.startsAt,
            l.endsAt,
            l.amount,
            l.note,
            l.createdAt,
          ]),
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("SyncFailed", { message: e?.message ?? "Unknown" });
  } finally {
    await conn.end();
  }
}

// ------------------------------------------------------------
// قوالب الأدوار ← أدوار ثابتة جوه قاعدة الشركة (roles.templateKey = "T<رقم القالب>")
// - الدور موجود بنفس القالب: بيتحدّث (الاسم، الحالة، الصلاحيات)
// - دور عادي بنفس الاسم: بيتحوّل لثابت (عشان الأسماء متتكررش)
// - قالب اتمسح من اللوحة: الدور بيفضل عند الشركة بس بيبقى عادي (مش ثابت)
// ------------------------------------------------------------
export async function applyRoleTemplates(dbName, templates) {
  if (!DB_NAME_RE.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const conn = await connect(dbName);
  try {
    const [c] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'templateKey'",
      [dbName],
    );
    if (Number(c.n) === 0) throw new AppError("RoleTemplatesColumnMissing");

    await conn.beginTransaction();
    try {
      const keys = [];
      for (const t of templates) {
        const key = `T${t.id}`;
        keys.push(key);
        let [r] = await conn.query(
          "SELECT id FROM `roles` WHERE templateKey = ? LIMIT 1",
          [key],
        );
        if (!r) {
          [r] = await conn.query(
            "SELECT id FROM `roles` WHERE (arName = ? OR enName = ?) AND isSuper = false AND isOwner = false AND templateKey IS NULL LIMIT 1",
            [t.arName, t.enName],
          );
        }
        let roleId;
        if (r) {
          roleId = r.id;
          await conn.query(
            "UPDATE `roles` SET arName = ?, enName = ?, isActive = ?, isSuper = false, templateKey = ?, updatedAt = NOW(3) WHERE id = ?",
            [t.arName, t.enName, t.isActive, key, roleId],
          );
        } else {
          const ins = await conn.query(
            "INSERT INTO `roles` (arName, enName, isActive, isSuper, isOwner, templateKey, updatedAt) VALUES (?, ?, ?, false, false, ?, NOW(3))",
            [t.arName, t.enName, t.isActive, key],
          );
          roleId = Number(ins.insertId);
        }
        await conn.query("DELETE FROM `role_permissions` WHERE roleId = ?", [
          roleId,
        ]);
        const perms = [...new Set(t.permissions ?? [])];
        if (perms.length)
          await conn.batch(
            "INSERT INTO `role_permissions` (roleId, permission) VALUES (?, ?)",
            perms.map((p) => [roleId, p]),
          );
      }
      // قوالب اتمسحت من اللوحة: الدور يرجع عادي
      if (keys.length)
        await conn.query(
          `UPDATE \`roles\` SET templateKey = NULL WHERE templateKey IS NOT NULL AND templateKey NOT IN (${keys.map(() => "?").join(",")})`,
          keys,
        );
      else
        await conn.query(
          "UPDATE `roles` SET templateKey = NULL WHERE templateKey IS NOT NULL",
        );
      await conn.commit();
      return { count: templates.length };
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("TemplatesFailed", { message: e?.message ?? "Unknown" });
  } finally {
    await conn.end();
  }
}

// قواعد على السيرفر فيها أدوار (للاستيراد منها)
export async function databasesWithRoles() {
  const conn = await connect();
  try {
    const rows = await conn.query(
      `SELECT TABLE_SCHEMA AS db FROM information_schema.TABLES
        WHERE TABLE_NAME = 'role_permissions'
          AND TABLE_SCHEMA IN (SELECT TABLE_SCHEMA FROM information_schema.TABLES WHERE TABLE_NAME = 'roles')
        ORDER BY TABLE_SCHEMA`,
    );
    return rows.map((r) => r.db);
  } finally {
    await conn.end();
  }
}

// الأدوار وصلاحياتها من قاعدة (من غير مدير النظام ودور المالك)
export async function readRolesFromDb(dbName) {
  if (!/^[A-Za-z0-9_$]{1,64}$/.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const dbs = await databasesWithRoles();
  if (!dbs.includes(dbName)) throw new AppError("NotFound");
  const conn = await connect(dbName);
  try {
    const cols = await conn.query(
      "SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'roles'",
      [dbName],
    );
    const has = new Set(cols.map((x) => x.c));
    const roles = await conn.query(
      `SELECT id, arName, enName, isActive FROM \`roles\`
        WHERE ${has.has("isSuper") ? "isSuper = false" : "1=1"}
          AND ${has.has("isOwner") ? "isOwner = false" : "1=1"}
        ORDER BY id`,
    );
    const perms = await conn.query(
      "SELECT roleId, permission FROM `role_permissions`",
    );
    return roles.map((r) => ({
      arName: r.arName,
      enName: r.enName,
      isActive: Boolean(r.isActive),
      permissions: perms
        .filter((p) => p.roleId === r.id)
        .map((p) => p.permission),
    }));
  } finally {
    await conn.end();
  }
}

// ------------------------------------------------------------
// قوالب طرق الدفع ← طرق دفع ثابتة جوه قاعدة الشركة
// (payment_methods.templateKey = "P<رقم القالب>")
// - موجودة بنفس القالب: بتتحدّث (الاسم، النوع، رقم العملية، الترتيب)
//   والحالة (نشطة/موقوفة) بتاعة الشركة: ما بتتغيرش
// - طريقة عادية بنفس الاسم: بتتحوّل لثابتة (وحالتها زي ما هي)
// - جديدة: بتتضاف بحالة القالب
// - قالب اتمسح من اللوحة: الطريقة بتفضل عند الشركة بس بترجع عادية
// ------------------------------------------------------------
export async function applyPaymentTemplates(dbName, templates) {
  if (!DB_NAME_RE.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const conn = await connect(dbName);
  try {
    const [c] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'payment_methods' AND COLUMN_NAME = 'templateKey'",
      [dbName],
    );
    if (Number(c.n) === 0) throw new AppError("PaymentTemplatesColumnMissing");

    await conn.beginTransaction();
    try {
      const keys = [];
      for (const t of templates) {
        const key = `P${t.id}`;
        keys.push(key);
        let [r] = await conn.query(
          "SELECT id FROM `payment_methods` WHERE templateKey = ? LIMIT 1",
          [key],
        );
        if (!r) {
          [r] = await conn.query(
            "SELECT id FROM `payment_methods` WHERE (arName = ? OR enName = ?) AND templateKey IS NULL LIMIT 1",
            [t.arName, t.enName],
          );
        }
        if (r) {
          await conn.query(
            "UPDATE `payment_methods` SET arName = ?, enName = ?, type = ?, requiresReference = ?, sortOrder = ?, templateKey = ?, updatedAt = NOW(3) WHERE id = ?",
            [
              t.arName,
              t.enName,
              t.type,
              t.requiresReference,
              t.sortOrder,
              key,
              r.id,
            ],
          );
        } else {
          await conn.query(
            "INSERT INTO `payment_methods` (arName, enName, type, requiresReference, sortOrder, isActive, templateKey, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3))",
            [
              t.arName,
              t.enName,
              t.type,
              t.requiresReference,
              t.sortOrder,
              t.isActive,
              key,
            ],
          );
        }
      }
      // قوالب اتمسحت من اللوحة: الطريقة ترجع عادية
      if (keys.length)
        await conn.query(
          `UPDATE \`payment_methods\` SET templateKey = NULL WHERE templateKey IS NOT NULL AND templateKey NOT IN (${keys.map(() => "?").join(",")})`,
          keys,
        );
      else
        await conn.query(
          "UPDATE `payment_methods` SET templateKey = NULL WHERE templateKey IS NOT NULL",
        );
      await conn.commit();
      return { count: templates.length };
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    // اسم مكرر مع طريقة تانية عند الشركة
    if (e?.errno === 1062) throw new AppError("PaymentTemplateNameTaken");
    throw new AppError("PaymentTemplatesFailed", {
      message: e?.message ?? "Unknown",
    });
  } finally {
    await conn.end();
  }
}

// قواعد على السيرفر فيها طرق دفع (للاستيراد منها)
export async function databasesWithPaymentMethods() {
  const conn = await connect();
  try {
    const rows = await conn.query(
      "SELECT TABLE_SCHEMA AS db FROM information_schema.TABLES WHERE TABLE_NAME = 'payment_methods' ORDER BY TABLE_SCHEMA",
    );
    return rows.map((r) => r.db);
  } finally {
    await conn.end();
  }
}

// طرق الدفع من قاعدة
export async function readPaymentMethodsFromDb(dbName) {
  if (!/^[A-Za-z0-9_$]{1,64}$/.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const dbs = await databasesWithPaymentMethods();
  if (!dbs.includes(dbName)) throw new AppError("NotFound");
  const conn = await connect(dbName);
  try {
    const rows = await conn.query(
      "SELECT arName, enName, type, requiresReference, sortOrder, isActive FROM `payment_methods` ORDER BY sortOrder, id",
    );
    return rows.map((r) => ({
      arName: r.arName,
      enName: r.enName,
      type: r.type,
      requiresReference: Boolean(r.requiresReference),
      sortOrder: Number(r.sortOrder) || 0,
      isActive: Boolean(r.isActive),
    }));
  } finally {
    await conn.end();
  }
}

// ------------------------------------------------------------
// حذف قاعدة شركة ومستخدم MySQL بتاعها (نهائي، مفيش رجوع)
// ------------------------------------------------------------
export async function dropDatabase(dbName, dbUser) {
  if (!DB_NAME_RE.test(dbName) || !DB_USER_RE.test(dbUser))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  // أمان: مستحيل نمسح قاعدة اللوحة نفسها أو قواعد MySQL الأساسية
  const protectedDbs = [
    dbConfig().database,
    "mysql",
    "sys",
    "information_schema",
    "performance_schema",
  ].map((x) => String(x).toLowerCase());
  if (protectedDbs.includes(dbName.toLowerCase()))
    throw new AppError("ProtectedDatabase");
  const conn = await connect();
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn.query("DROP USER IF EXISTS ?@?", [dbUser, userHost()]);
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("ProvisionFailed", { message: e?.message ?? "Unknown" });
  } finally {
    await conn.end();
  }
}

// مستخدم MySQL للشركة: يتعمل لو مش موجود + الباسورد + الصلاحيات
async function ensureDbUser(conn, dbName, { dbUser, dbPassword }) {
  const host = userHost();
  await conn.query("CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?", [
    dbUser,
    host,
    dbPassword,
  ]);
  await conn.query("ALTER USER ?@? IDENTIFIED BY ?", [
    dbUser,
    host,
    dbPassword,
  ]);
  await conn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO ?@?`, [
    dbUser,
    host,
  ]);
}

// ------------------------------------------------------------
// تحديث قاعدة شركة موجودة بالـ migrations الجديدة
// ------------------------------------------------------------
// account: { dbUser, dbPassword } ← نتأكد إن مستخدم MySQL بتاع الشركة موجود
// وباسورده مظبوط (مثلاً بعد إعادة تسطيب MySQL واسترجاع القواعد من نسخة)
export async function migrateDatabase(
  dbName,
  migrations = readMigrations(),
  account = null,
) {
  if (!DB_NAME_RE.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  if (account && !DB_USER_RE.test(account.dbUser))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const conn = await connect(dbName);
  try {
    if (account) await ensureDbUser(conn, dbName, account);
    const applied = await applyPending(conn, migrations);
    return { applied: applied.length };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("ProvisionFailed", { message: e?.message ?? "Unknown" });
  } finally {
    await conn.end();
  }
}

// ------------------------------------------------------------
// أسماء التحديثات المطبّقة على قاعدة (لشاشة "تحديث القواعد")
// ------------------------------------------------------------
export async function appliedMigrations(dbName) {
  try {
    if (!DB_NAME_RE.test(dbName)) throw new Error("Invalid name");
    const conn = await connect(dbName);
    try {
      const rows = await conn.query(
        "SELECT migration_name, finished_at, rolled_back_at FROM `_prisma_migrations`",
      );
      return {
        ok: true,
        applied: rows.filter((r) => r.finished_at).map((r) => r.migration_name),
        failed: rows.some((r) => !r.finished_at && !r.rolled_back_at),
      };
    } finally {
      await conn.end();
    }
  } catch {
    return { ok: false, error: "DbUnreachable" };
  }
}

// ------------------------------------------------------------
// حالة القاعدة: كام migration ناقص (للعرض في تفاصيل الشركة)
// ------------------------------------------------------------
export async function databaseStatus(dbName) {
  try {
    const migrations = readMigrations();
    const conn = await connect(dbName);
    try {
      const rows = await conn.query(
        "SELECT migration_name, finished_at, rolled_back_at FROM `_prisma_migrations`",
      );
      const done = new Set(
        rows.filter((r) => r.finished_at).map((r) => r.migration_name),
      );
      return {
        ok: true,
        total: migrations.length,
        pending: migrations.filter((m) => !done.has(m.name)).length,
        failed: rows.some((r) => !r.finished_at && !r.rolled_back_at),
      };
    } finally {
      await conn.end();
    }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof AppError && e.code === "MigrationsDirMissing"
          ? e.code
          : "DbUnreachable",
    };
  }
}

// تعديل بيانات الشركة في اللوحة ← بيانات الشركة في البرنامج
export async function pushCompanyInfo(dbName, c) {
  if (!DB_NAME_RE.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const conn = await connect(dbName);
  try {
    await writeCompanyRow(conn, c);
  } finally {
    await conn.end();
  }
  return true;
}

// ------------------------------------------------------------
// تطبيقات التوصيل ← sales_channels في قاعدة الشركة (templateKey = "C<رقم التطبيق>")
// rows: كل التطبيقات اللي اتفعّلت عند الشركة قبل كده (المقفول isActive = false)
// تطبيق مش في rows: بيتقفل (أسعاره وتقاريره القديمة بتفضل)
// ------------------------------------------------------------
export async function applySalesChannels(dbName, rows) {
  if (!DB_NAME_RE.test(dbName))
    throw new AppError("ProvisionFailed", { message: "Invalid name" });
  const conn = await connect(dbName);
  try {
    const [c] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sales_channels'",
      [dbName],
    );
    if (Number(c.n) === 0) throw new AppError("SalesChannelsTableMissing");

    await conn.beginTransaction();
    try {
      const keys = [];
      for (const r of rows) {
        const key = `C${r.templateId}`;
        keys.push(key);
        await conn.query(
          "INSERT INTO `sales_channels` (templateKey, arName, enName, markupType, markupValue, commissionPercent, sortOrder, isActive, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3)) ON DUPLICATE KEY UPDATE arName = VALUES(arName), enName = VALUES(enName), markupType = VALUES(markupType), markupValue = VALUES(markupValue), commissionPercent = VALUES(commissionPercent), sortOrder = VALUES(sortOrder), isActive = VALUES(isActive), updatedAt = NOW(3)",
          [
            key,
            r.arName,
            r.enName,
            r.markupType,
            r.markupValue,
            r.commissionPercent,
            r.sortOrder,
            r.isActive,
          ],
        );
      }
      await conn.query(
        keys.length
          ? `UPDATE \`sales_channels\` SET isActive = false, updatedAt = NOW(3) WHERE isActive = true AND templateKey NOT IN (${keys.map(() => "?").join(",")})`
          : "UPDATE `sales_channels` SET isActive = false, updatedAt = NOW(3) WHERE isActive = true",
        keys,
      );
      await conn.commit();
      return { count: rows.filter((r) => r.isActive).length };
    } catch (e) {
      await conn.rollback();
      throw e;
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError("SalesChannelsFailed", {
      message: e?.message ?? "Unknown",
    });
  } finally {
    await conn.end();
  }
}
