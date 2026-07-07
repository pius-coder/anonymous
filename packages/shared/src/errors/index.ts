export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, message: string, code: string = "ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends ApiError {
  public errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super(400, "Validation failed", "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = "Resource already exists") {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}
