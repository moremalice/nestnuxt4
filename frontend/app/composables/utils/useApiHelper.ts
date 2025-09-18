// frontend/app/composables/utils/useApiHelper.ts

// ===== 타입 정의 =====

export interface ApiSuccess<T = unknown> {
  status: 'success'
  data: T
}

export interface ApiError {
  status: 'error'
  data: {
    name: string
    message: string
    fields?: Record<string, string[]>
  }
  statusCode?: number
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

export interface ApiResult<T = unknown> {
  data: T | null
  error: {
    code: string
    message: string
    details?: Record<string, any>
  } | null
}

export interface ApiOptions {
  immediate?: boolean
  lazy?: boolean
  server?: boolean
  key?: string
  transform?: (data: any) => any
  default?: () => any
  watch?: any[]
  timeout?: number
  retry?: number | false
  retryDelay?: number
  dedupe?: 'cancel' | 'defer'
  skipAuth?: boolean
  skipCsrf?: boolean
  withLoading?: boolean
  signal?: AbortSignal
}

// ===== 타입 가드 =====

export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response?.status === 'success'
}

export function isApiError(response: ApiResponse<any>): response is ApiError {
  return response?.status === 'error'
}

// ===== 에러 정규화 =====

export function normalizeError(err: any): ApiResult<never>['error'] {
  // 백엔드 표준 에러
  if (err?.data?.status === 'error' && err?.data?.data) {
    const errorData = err.data.data
    const statusCode = err.data.statusCode
    return {
      code: errorData.name || 'UnknownError',
      message: errorData.message || 'An error occurred',
      details: {
        ...(errorData.fields && { fields: errorData.fields }),
        ...(statusCode && { statusCode })
      }
    }
  }

  // HTTP 상태 기반 에러 (비표준 에러 대응)
  const status = err?.statusCode || err?.status
  if (status) {
    const statusMessages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Authentication required',
      403: 'Access forbidden',
      404: 'Resource not found',
      409: 'Conflict',
      422: 'Validation failed',
      429: 'Too many requests',
      500: 'Internal server error',
      502: 'Bad gateway',
      503: 'Service unavailable',
      504: 'Gateway timeout'
    }

    return {
      code: `HTTP_${status}`,
      message: statusMessages[status] || err?.statusMessage || `HTTP Error ${status}`,
      details: { statusCode: status }
    }
  }

  // 네트워크 에러
  if (err?.name === 'FetchError' || err?.cause?.name === 'FetchError') {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      details: { originalError: err.message }
    }
  }

  // 타임아웃
  if (err?.name === 'AbortError' || err?.code === 'ECONNABORTED') {
    return {
      code: 'TIMEOUT',
      message: 'Request timeout',
      details: undefined
    }
  }

  // 기본 에러
  return {
    code: 'UNKNOWN_ERROR',
    message: err?.message || 'An unexpected error occurred',
    details: undefined
  }
}

// ===== 응답 변환 =====

export function transformToApiResult<T>(response: ApiResponse<T> | null | undefined): ApiResult<T> {
  if (!response) {
    return {
      data: null,
      error: {
        code: 'NO_RESPONSE',
        message: 'No response received'
      }
    }
  }

  if (isApiSuccess(response)) {
    return {
      data: response.data,
      error: null
    }
  }

  if (isApiError(response)) {
    return {
      data: null,
      error: {
        code: response.data.name,
        message: response.data.message,
        details: {
          ...(response.data.fields && { fields: response.data.fields }),
          ...(response.statusCode && { statusCode: response.statusCode })
        }
      }
    }
  }

  // Fallback
  return {
    data: null,
    error: {
      code: 'INVALID_RESPONSE',
      message: 'Invalid response format'
    }
  }
}

// ===== 특수 에러 체크 =====

export function isCsrfError(error: ApiResult<any>['error']): boolean {
  if (!error) return false

  return error.code === 'CSRF_ERROR' ||
         error.code === 'ForbiddenException' ||
         error.message.toLowerCase().includes('csrf')
}

export function isAuthError(error: ApiResult<any>['error']): boolean {
  if (!error) return false

  return error.code === 'UnauthorizedException' ||
         error.message.toLowerCase().includes('unauthorized') ||
         error.message.toLowerCase().includes('authentication')
}

export function isValidationError(error: ApiResult<any>['error']): boolean {
  if (!error) return false

  return error.code === 'ValidationError' ||
         error.code === 'BadRequestException' ||
         (error.details !== undefined && 'fields' in error.details)
}

// ===== 쿼리 빌더 =====

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return

    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(key, String(v)))
    } else if (typeof value === 'object') {
      searchParams.append(key, JSON.stringify(value))
    } else {
      searchParams.append(key, String(value))
    }
  })

  return searchParams.toString()
}

