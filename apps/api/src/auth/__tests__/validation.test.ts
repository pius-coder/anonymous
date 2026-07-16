import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from "../validation.js";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts registration with name", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test User");
    }
  });

  it("normalizes email to lowercase", () => {
    const result = registerSchema.safeParse({
      email: "Test@Example.COM",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });

  it("rejects weak password", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase", () => {
    const result = loginSchema.safeParse({
      email: "TEST@EXAMPLE.COM",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("test@example.com");
    }
  });
});

describe("passwordResetRequestSchema (L1)", () => {
  it("accepts and normalizes email", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "Player@Example.COM",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("player@example.com");
    }
  });

  it("rejects invalid email", () => {
    expect(passwordResetRequestSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("passwordResetSchema (L1)", () => {
  it("accepts opaque token and strong password", () => {
    const result = passwordResetSchema.safeParse({
      token: "opaque-single-use-token",
      newPassword: "Str0ng-Passphrase!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects weak password", () => {
    const result = passwordResetSchema.safeParse({
      token: "opaque-token",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty token", () => {
    const result = passwordResetSchema.safeParse({
      token: "",
      newPassword: "longenough",
    });
    expect(result.success).toBe(false);
  });
});
