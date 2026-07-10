export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string[] | unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, string[] | unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static fromResponse(res: Response, body: { error?: { code?: string; message?: string; details?: Record<string, string[] | unknown> } }): ApiError {
    return new ApiError(
      body.error?.code ?? "HTTP_ERROR",
      body.error?.message ?? `HTTP ${res.status}`,
      res.status,
      body.error?.details,
    );
  }
}
