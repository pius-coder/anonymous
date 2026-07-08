import { scrypt, timingSafeEqual, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const SCRYPT_VERSION = "1";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const HASH_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scryptAsync(password, salt, HASH_LENGTH)) as Buffer;

  return [
    "scrypt",
    SCRYPT_VERSION,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    HASH_LENGTH,
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string) {
  const parts = storedHash.split("$");
  if (parts.length !== 8) return false;

  const [algorithm, version, _n, _r, _p, keyLength, salt, hash] = parts;
  if (algorithm !== "scrypt" || version !== SCRYPT_VERSION || !salt || !hash) return false;

  const expected = Buffer.from(hash, "base64url");
  const derivedKey = (await scryptAsync(password, salt, Number(keyLength))) as Buffer;

  if (expected.byteLength !== derivedKey.byteLength) return false;
  return timingSafeEqual(expected, derivedKey);
}
