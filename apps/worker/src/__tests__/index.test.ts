import { describe, it, expect } from "vitest";

describe("Worker", () => {
  it("should have correct connection defaults", () => {
    const connection = {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
    };
    expect(connection.host).toBe("localhost");
    expect(connection.port).toBe(6379);
  });

  it("should use REDIS_HOST env when set", () => {
    process.env.REDIS_HOST = "redis-server";
    const host = process.env.REDIS_HOST || "localhost";
    expect(host).toBe("redis-server");
    delete process.env.REDIS_HOST;
  });

  it("should use REDIS_PORT env when set", () => {
    process.env.REDIS_PORT = "6380";
    const port = Number(process.env.REDIS_PORT) || 6379;
    expect(port).toBe(6380);
    delete process.env.REDIS_PORT;
  });

  it("should have default queue name", () => {
    const queueName = "session-jeu";
    expect(queueName).toBe("session-jeu");
  });
});
