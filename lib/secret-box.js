import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { AppError } from "@/lib/errors";

// ============================================================
// تشفير الأسرار (باسوردات قواعد الشركات) بـ AES-256-GCM
// المفتاح: PANEL_SECRET_KEY في .env (32 حرف أو أكتر)
// ⚠ نفس المفتاح لازم يبقى في البرنامج الأساسي عشان يفك باسورد كل قاعدة
// ⚠ لو المفتاح اتغيّر أو ضاع: الأسرار المتخزنة مش هتتفك
// الشكل: v1:iv:tag:ciphertext (Base64)
// ============================================================

function key() {
  const raw = process.env.PANEL_SECRET_KEY?.trim();
  if (!raw || raw.length < 32) throw new AppError("SecretKeyMissing");
  return createHash("sha256").update(raw, "utf8").digest();
}

export const secretKeyReady = () =>
  (process.env.PANEL_SECRET_KEY?.trim().length ?? 0) >= 32;

export function encryptSecret(plain) {
  if (plain == null || plain === "") return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    data.toString("base64"),
  ].join(":");
}

export function decryptSecret(value) {
  if (!value) return null;
  const [version, iv, tag, data] = String(value).split(":");
  if (version !== "v1" || !iv || !tag || !data) {
    throw new AppError("SecretUnreadable");
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("SecretUnreadable");
  }
}

// باسورد عشوائي قوي (لقواعد البيانات أو باسورد مؤقت)
const PASS_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
export function randomPassword(length = 20) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++)
    out += PASS_CHARS[bytes[i] % PASS_CHARS.length];
  return out;
}
