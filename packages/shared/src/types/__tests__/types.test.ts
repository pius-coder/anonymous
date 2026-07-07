import { describe, it, expect } from "vitest";
import type {
  PaginationParams,
  PaginatedResponse,
  ApiResponse,
  UserContext,
} from "../index.js";

describe("Type Interfaces", () => {
  it("should accept valid PaginationParams", () => {
    const params: PaginationParams = { page: 1, limit: 20 };
    expect(params.page).toBe(1);
    expect(params.limit).toBe(20);
  });

  it("should accept partial PaginationParams", () => {
    const params: PaginationParams = {};
    expect(params.page).toBeUndefined();
    expect(params.limit).toBeUndefined();
  });

  it("should accept valid PaginatedResponse", () => {
    const response: PaginatedResponse<string> = {
      data: ["a", "b", "c"],
      meta: { total: 10, page: 1, limit: 3, totalPages: 4 },
    };
    expect(response.data).toHaveLength(3);
    expect(response.meta.total).toBe(10);
    expect(response.meta.totalPages).toBe(4);
  });

  it("should accept valid ApiResponse with data", () => {
    const response: ApiResponse<{ name: string }> = {
      success: true,
      data: { name: "Test" },
    };
    expect(response.success).toBe(true);
    expect(response.data?.name).toBe("Test");
  });

  it("should accept valid ApiResponse with error", () => {
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "User not found",
        details: { email: ["Invalid"] },
      },
    };
    expect(response.success).toBe(false);
    expect(response.error?.code).toBe("NOT_FOUND");
  });

  it("should accept valid UserContext", () => {
    const user: UserContext = {
      id: "user-1",
      email: "test@example.com",
      role: "PLAYER",
    };
    expect(user.id).toBe("user-1");
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("PLAYER");
  });
});
