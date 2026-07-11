import { ApiError } from "./errors";
import { cookies } from "next/headers";
import { z } from "zod";

export type ApiResponse<T> = {
  status: number;
  response: T;
};

export type ApiRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | undefined>;
  authenticated?: boolean;
  tag?: string;
};

export abstract class BaseApiService {
  protected defaultHeaders: Record<string, string>;

  constructor(defaultHeaders: Record<string, string> = {}) {
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...defaultHeaders,
    };
  }

  /**
   * Get the session cookie string for auth
   */
  protected async getCookieToken(): Promise<string | null> {
    try {
      const cookieStore = await cookies();
      return cookieStore.toString();
    } catch {
      return null;
    }
  }

  /**
   * Construct full URL with query parameters
   */
  private async buildUrl(
    endpoint: string,
    query?: Record<string, string | undefined>,
  ): Promise<string> {
    const baseUrl = process.env.API_URL || "http://localhost:3001";
    const url = new URL(`${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null) {
          url.searchParams.set(key, value);
        }
      });
    }

    return url.toString();
  }

  /**
   * Prepare headers for the request
   */
  private async prepareHeaders(options: ApiRequestOptions): Promise<Headers> {
    const headers = new Headers(this.defaultHeaders);

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    if (options.authenticated !== false) {
      const token = await this.getCookieToken();
      if (token) {
        headers.set("cookie", token);
      }
    }

    return headers;
  }

  /**
   * Process and validate the API response
   */
  private async processResponse<T>(
    response: Response,
    responseSchema?: z.ZodType<T>,
  ): Promise<ApiResponse<T>> {
    if (!response.ok) {
      let errorData: {
        error?: { code?: string; message?: string; details?: Record<string, string[] | unknown> };
        message?: string | string[];
      } = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = {};
      }

      if (errorData?.error) {
        throw ApiError.fromResponse(response, errorData);
      }

      if (response.status === 401) {
        throw new ApiError("UNAUTHENTICATED", "Non authentifié", 401);
      }

      const message = Array.isArray(errorData?.message)
        ? errorData.message[0]
        : typeof errorData?.message === "string"
          ? errorData.message
          : `HTTP ${response.status}`;

      throw new ApiError("HTTP_ERROR", message, response.status);
    }

    const responseData = await response.json();

    if (responseSchema) {
      const payload = responseData?.data ?? responseData;
      const validationResult = responseSchema.safeParse(payload);
      if (!validationResult.success) {
        throw new ApiError("VALIDATION_ERROR", "Response validation failed", 422);
      }
    }

    const data = (responseData?.data ?? responseData) as T;
    return {
      status: response.status,
      response: data,
    };
  }

  /**
   * Make an API request with comprehensive error handling
   */
  protected async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
    responseSchema?: z.ZodType<T>,
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, query } = options;
    const url = await this.buildUrl(endpoint, query);
    const headers = await this.prepareHeaders(options);

    const fetchOptions: RequestInit = {
      method,
      headers,
      cache: "no-store",
      ...(body !== undefined && {
        body: JSON.stringify(body),
      }),
      next: options.tag ? { tags: [options.tag] } : undefined,
    };

    const response = await fetch(url, fetchOptions);
    return this.processResponse(response, responseSchema);
  }
}
