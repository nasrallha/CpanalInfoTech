import "server-only";
import fs from "node:fs";
import readline from "node:readline";
import mariadb from "mariadb";

// ============================================================
// استرجاع نسخة احتياطية (ملف .sql معمول بـ lib/db-dump - نفس البرنامج الأساسي)
// - قراءة أولى: نتأكد إن الملف نسخة، ونجيب أسماء الجداول والـ migrations اللي فيه
// - قراءة تانية: تنفيذ الأوامر واحد واحد (الملف بيمسح كل جدول ويعمله من جديد)
// الأوامر في الملف كل واحد بيخلص بسطر آخره ";" (النصوص جواها مفيهاش سطور جديدة)
// ============================================================

export const BACKUP_HEADER = "-- ERP database backup";

const lines = (file) =>
  readline.createInterface({
    input: fs.createReadStream(file, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

// معلومات الملف: نسخة صحيحة؟ + الجداول + الـ migrations
export async function inspectBackup(file) {
  let n = 0;
  let valid = false;
  let currentTable = null;
  const tables = new Set();
  const migrations = new Set();
  for await (const line of lines(file)) {
    n++;
    if (n <= 5 && line.startsWith(BACKUP_HEADER)) valid = true;
    if (n === 6 && !valid) break;
    const m = line.match(/^CREATE TABLE `([^`]+)`/);
    if (m) {
      currentTable = m[1];
      tables.add(m[1]);
      continue;
    }
    if (currentTable === "_prisma_migrations" && line.startsWith("(")) {
      for (const mm of line.matchAll(/'(\d{14}_[A-Za-z0-9_]+)'/g))
        migrations.add(mm[1]);
    } else if (line.startsWith("INSERT INTO `_prisma_migrations`")) {
      currentTable = "_prisma_migrations";
    }
  }
  return { valid, tables: [...tables], migrations: [...migrations] };
}

const ident = (name) => `\`${String(name).replace(/`/g, "``")}\``;

// تنفيذ الملف على قاعدة (cfg: بيانات الاتصال + database)
// - الجداول الموجودة ومش في النسخة (اتعملت بعدها) بتتمسح، والـ migrations
//   بتعيد عملها نضيف بعد الاسترجاع
// - keep: جداول ما تتلمسش خالص (لا تتمسح ولا تتكتب من النسخة)
export async function executeBackup(file, { tables }, cfg, keepTables = []) {
  const keepRe = keepTables.length
    ? new RegExp(
        `^\\s*(DROP TABLE IF EXISTS|CREATE TABLE|INSERT INTO|LOCK TABLES|ALTER TABLE)\\s+\`(${keepTables.join("|")})\``,
        "i",
      )
    : null;
  let conn;
  let statements = 0;
  try {
    conn = await mariadb.createConnection({
      ...cfg,
      charset: "utf8mb4",
      connectTimeout: 10000,
      allowPublicKeyRetrieval: true,
    });
    await conn.query("SET SESSION FOREIGN_KEY_CHECKS = 0");

    const existing = await conn.query({
      sql: "SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'",
      rowsAsArray: true,
    });
    const keep = new Set([...tables, ...keepTables]);
    for (const [t] of existing) {
      if (!keep.has(t)) await conn.query(`DROP TABLE IF EXISTS ${ident(t)}`);
    }

    let buf = "";
    const run = async (sql) => {
      if (keepRe && keepRe.test(sql)) return;
      await conn.query(sql);
      statements++;
    };
    for await (const line of lines(file)) {
      if (!buf && (line.startsWith("--") || !line.trim())) continue;
      buf = buf ? `${buf}\n${line}` : line;
      if (line.trimEnd().endsWith(";")) {
        await run(buf);
        buf = "";
      }
    }
    if (buf.trim()) await run(buf);
    await conn.query("SET SESSION FOREIGN_KEY_CHECKS = 1");
    return { statements };
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
