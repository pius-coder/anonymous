import { describe, it, expect } from "vitest";
import { ApiError, NotFoundError, ValidationError, UnauthorizedError } from "../index.js";

describe("ApiError", () => {
  it("should create an error with status code and message", () => {
    const error = new ApiError(400, "Bad request");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Bad request");
    expect(error.code).toBe("ERROR");
  });

  it("should accept custom code", () => {
    const error = new ApiError(400, "Bad request", "CUSTOM_ERROR");
    expect(error.code).toBe("CUSTOM_ERROR");
  });
});

describe("NotFoundError", () => {
  it("should create a 404 error with resource name", () => {
    const error = new NotFoundError("User");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("User not found");
    expect(error.code).toBe("NOT_FOUND");
  });

  it("should use default resource name", () => {
    const error = new NotFoundError();
    expect(error.message).toBe("Resource not found");
  });
});

describe("ValidationError", () => {
  it("should create a 400 error with validation errors", () => {
    const errors = { email: ["Invalid email"], name: ["Required"] };
    const error = new ValidationError(errors);
    expect(error.statusCode).toBe(400);
    expect(error.errors).toEqual(errors);
  });
});

describe("UnauthorizedError", () => {
  it("should create a 401 error", () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("UNAUTHORIZED");
  });
});
