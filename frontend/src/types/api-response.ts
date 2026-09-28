/**
 * Mirrors the backend's response envelope (backend CLAUDE.md section 46.4 / ApiResponse.java).
 * Keep the two in sync by hand until there is a shared schema generator.
 */
export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: ApiFieldError[];
}

export interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ApiMeta {
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
  meta: ApiMeta;
}
