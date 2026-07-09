import { describe, it, expect, vi } from "vitest";
import { randomNonce } from "../lib/nonce";

describe("randomNonce", () => {
  it("returns a non-empty unique-looking string", () => {
    const a = randomNonce();
    const b = randomNonce();
    expect(typeof a).toBe("string");
    expect(a.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });

  it("honors the prefix when using the fallback path", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {} as Crypto,
    });
    try {
      const n = randomNonce("reg");
      expect(n.startsWith("reg_")).toBe(true);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: original,
      });
    }
  });

  it("uses crypto.randomUUID when available", () => {
    const spy = vi.fn(() => "uuid-spy");
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: spy } as unknown as Crypto,
    });
    try {
      expect(randomNonce()).toBe("uuid-spy");
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: original,
      });
    }
  });
});
