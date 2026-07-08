import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password.js";

describe("password hashing", () => {
  it("hashes passwords without storing plaintext", async () => {
    const hash = await hashPassword("CorrectHorse2026!");

    expect(hash).not.toContain("CorrectHorse2026!");
    expect(hash.startsWith("scrypt$1$")).toBe(true);
  });

  it("uses a unique salt for each password hash", async () => {
    const first = await hashPassword("CorrectHorse2026!");
    const second = await hashPassword("CorrectHorse2026!");

    expect(first).not.toBe(second);
  });

  it("verifies correct passwords and rejects invalid passwords", async () => {
    const hash = await hashPassword("CorrectHorse2026!");

    await expect(verifyPassword("CorrectHorse2026!", hash)).resolves.toBe(true);
    await expect(verifyPassword("WrongHorse2026!", hash)).resolves.toBe(false);
  });
});
