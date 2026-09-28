import axios, { AxiosError } from "axios";
import type { ApiErrorBody, ApiResponse } from "@/types/api-response";

/**
 * Single shared HTTP client — no component/feature calls fetch/axios directly
 * (CLAUDE.md section 46.2). `withCredentials` is on because the recommended auth
 * approach is an httpOnly cookie set by the backend rather than a token read into
 * JS/localStorage, which reduces XSS token-theft exposure (see backend README).
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
});

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: ApiErrorBody["fieldErrors"],
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const body = error.response?.data?.error;

    if (body) {
      return Promise.reject(new ApiRequestError(body.code, body.message, body.fieldErrors));
    }

    // Network error, timeout, or a non-JSON server error — never surface raw axios/HTML detail.
    return Promise.reject(new ApiRequestError("NETWORK_ERROR", "Unable to reach the server"));
  },
);
