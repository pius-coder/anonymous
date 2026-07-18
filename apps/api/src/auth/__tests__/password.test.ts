import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password.js";

describe("hashPassword", () => {
  it("produces different hashes for same password (unique salt)", () => {
    const hash1 = hashPassword("password123");
    const hash2 = hashPassword("password123");
    expect(hash1).not.toBe(hash2);
  });

  it("produces a hash with 7 parts separated by $", () => {
    const hash = hashPassword("test-password");
    const parts = hash.split("$");
    expect(parts).toHaveLength(7);
    expect(parts[0]).toBe("scrypt");
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", () => {
    const hash = hashPassword("securePass123!");
    expect(verifyPassword("securePass123!", hash)).toBe(true);
  });

  it("returns false for incorrect password", () => {
    const hash = hashPassword("securePass123!");
    expect(verifyPassword("wrongPassword", hash)).toBe(false);
  });

  it("returns false for malformed hash", () => {
    expect(verifyPassword("password", "invalid-hash")).toBe(false);
  });

  it("returns false for empty hash", () => {
    expect(verifyPassword("password", "")).toBe(false);
  });
});
