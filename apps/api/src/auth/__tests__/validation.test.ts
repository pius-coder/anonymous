import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, resetPasswordSchema } from "../validation.js";

describe("auth validation", () => {
  it("normalizes register email and accepts a valid player payload", () => {
    const result = registerSchema.safeParse({
      email: " Player@Example.COM ",
      password: "CorrectHorse2026!",
      username: "player_2026",
      name: "Player",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("player@example.com");
    }
  });

  it("rejects weak register passwords and invalid usernames", () => {
    const result = registerSchema.safeParse({
      email: "player@example.com",
      password: "short",
      username: "bad username",
    });

    expect(result.success).toBe(false);
  });

  it("rejects login payloads without credentials", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("requires reset tokens and strong replacement passwords", () => {
    const result = resetPasswordSchema.safeParse({
      token: "too-short",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});
