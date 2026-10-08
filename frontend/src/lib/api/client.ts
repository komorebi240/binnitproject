import axios, { AxiosError } from "axios";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { readStoredLocale } from "@/lib/i18n/storage";
import type { ApiErrorBody, ApiResponse } from "@/types/api-response";

/**
 * Single shared HTTP client - no component/feature calls fetch/axios directly
 * (CLAUDE.md section 46.2). `withCredentials` is on because the recommended auth
 * approach is an httpOnly cookie set by the backend rather than a token read into
 * JS/localStorage, which reduces XSS token-theft exposure (see backend README).
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

// The server words what it sends to people (emails) in the language of the request; the browser's own
// Accept-Language is the language of the operating system, not of the language chosen in the product.
apiClient.interceptors.request.use((config) => {
  config.headers.set("Accept-Language", readStoredLocale() ?? DEFAULT_LOCALE);
  return config;
});

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: ApiErrorBody["fieldErrors"],
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** A failed download arrives as a Blob (that is what the request asked for); the error envelope is inside it. */
async function errorBodyOf(error: AxiosError<ApiResponse<unknown>>): Promise<ApiErrorBody | undefined> {
  const data: unknown = error.response?.data;
  if (data instanceof Blob && data.type.includes("json")) {
    try {
      return (JSON.parse(await data.text()) as ApiResponse<unknown>).error ?? undefined;
    } catch {
      return undefined;
    }
  }
  return error.response?.data?.error ?? undefined;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const body = await errorBodyOf(error);

    if (body) {
      return Promise.reject(new ApiRequestError(body.code, body.message, body.fieldErrors, error.response?.status));
    }

    // Network error, timeout, or a non-JSON server error - never surface raw axios/HTML detail.
    return Promise.reject(new ApiRequestError("NETWORK_ERROR", "Unable to reach the server", undefined, error.response?.status));
  },
);
