export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  errors?: Record<string, string[]>;
  meta?: ApiMeta;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: ApiMeta;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  timestamp: string;
  path?: string;
  errors?: Record<string, string[]>;
}