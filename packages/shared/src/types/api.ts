// === 统一 API 响应体 ===

export interface ApiResponse<T = unknown> {
  code: number
  data: T | null
  message: string
  timestamp: number
}

export interface PaginatedData<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type PaginatedResponse<T> = ApiResponse<PaginatedData<T>>

// === 业务错误码 ===

export const ErrorCode = {
  SUCCESS: 0,
  BAD_REQUEST: 40000,
  UNAUTHORIZED: 40100,
  FORBIDDEN: 40300,
  NOT_FOUND: 40400,
  CONFLICT: 40900,
  RATE_LIMITED: 42900,
  INTERNAL_ERROR: 50000,
  AI_SERVICE_ERROR: 50001,
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]
