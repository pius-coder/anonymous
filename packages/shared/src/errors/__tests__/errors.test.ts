import { describe, it, expect } from "vitest";
import {
  ApiError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "../index.js";

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

  it("should accept custom message", () => {
    const error = new UnauthorizedError("Token expired");
    expect(error.message).toBe("Token expired");
  });
});

describe("ForbiddenError", () => {
  it("should create a 403 error with default message", () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("Forbidden");
  });

  it("should accept custom message", () => {
    const error = new ForbiddenError("Insufficient permissions");
    expect(error.message).toBe("Insufficient permissions");
  });
});

describe("ConflictError", () => {
  it("should create a 409 error with default message", () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("CONFLICT");
    expect(error.message).toBe("Resource already exists");
  });

  it("should accept custom message", () => {
    const error = new ConflictError("Email already taken");
    expect(error.message).toBe("Email already taken");
  });
});

describe("ApiError inheritance", () => {
  it("all errors should be instances of ApiError", () => {
    expect(new NotFoundError()).toBeInstanceOf(ApiError);
    expect(new ValidationError({})).toBeInstanceOf(ApiError);
    expect(new UnauthorizedError()).toBeInstanceOf(ApiError);
    expect(new ForbiddenError()).toBeInstanceOf(ApiError);
    expect(new ConflictError()).toBeInstanceOf(ApiError);
  });

  it("all errors should be instances of Error", () => {
    expect(new ApiError(500, "test")).toBeInstanceOf(Error);
    expect(new NotFoundError()).toBeInstanceOf(Error);
  });

  it("should have correct name property", () => {
    expect(new ApiError(500, "test").name).toBe("ApiError");
    expect(new NotFoundError().name).toBe("NotFoundError");
    expect(new ValidationError({}).name).toBe("ValidationError");
    expect(new UnauthorizedError().name).toBe("UnauthorizedError");
    expect(new ForbiddenError().name).toBe("ForbiddenError");
    expect(new ConflictError().name).toBe("ConflictError");
  });
});
