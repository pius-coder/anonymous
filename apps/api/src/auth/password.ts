import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_CONFIG = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
};

const SALT_LENGTH = 32;
const HASH_PREFIX = "scrypt";

function encodeBase64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function decodeBase64url(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const hash = scryptSync(password, salt, SCRYPT_CONFIG.keylen, {
    N: SCRYPT_CONFIG.N,
    r: SCRYPT_CONFIG.r,
    p: SCRYPT_CONFIG.p,
  });
  const parts = [
    HASH_PREFIX,
    String(SCRYPT_CONFIG.N),
    String(SCRYPT_CONFIG.r),
    String(SCRYPT_CONFIG.p),
    String(SCRYPT_CONFIG.keylen),
    encodeBase64url(salt),
    encodeBase64url(hash),
  ];
  return parts.join("$");
}

export function verifyPassword(password: string, hash: string): boolean {
  const parts = hash.split("$");
  if (parts.length !== 7 || parts[0] !== HASH_PREFIX) return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const keylen = Number(parts[4]);
  const salt = decodeBase64url(parts[5]);
  const expected = decodeBase64url(parts[6]);

  if ([n, r, p, keylen].some(isNaN)) return false;

  const actual = scryptSync(password, salt, keylen, { N: n, r, p });
  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}
