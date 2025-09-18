// frontend/app/composables/api/useNuxtApi.ts

import type {
  ApiResponse,
  ApiResult,
  ApiOptions
} from '../utils/useApiHelper'
import {
  transformToApiResult,
  normalizeError
} from '../utils/useApiHelper'

// ===== 내부 헬퍼 =====

async function prepareHeaders(
  method: string,
  options: Pick<ApiOptions, 'skipAuth' | 'skipCsrf'>
): Promise<HeadersInit> {
  const headers = new Headers()

  // Content-Type
  if (method !== 'GET' && method !== 'DELETE') {
    headers.set('Content-Type', 'application/json')
  }

  // Authentication
  if (!options.skipAuth) {
    const authStore = useAuthStore()
    const token = authStore.token

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // CSRF Token (POST/PUT/PATCH/DELETE)
  if (!options.skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    try {
      const authStore = useAuthStore()
      const csrfToken = await authStore.getCsrfToken()

      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken)
      }
    } catch (err) {
      console.warn('[API] CSRF token fetch failed:', err)
    }
  }

  return headers
}

// ===== 메인 API 함수 =====

export function useApi<T = unknown>(
  url: string,
  options: ApiOptions & {
    method?: string
    body?: any
    query?: Record<string, any>
  } = {}
) {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const {
    method = 'GET',
    body,
    query,
    immediate = true,
    lazy = false,
    server = true,
    key,
    transform,
    default: defaultFn,
    watch,
    timeout = 30000,
    retry = false,
    retryDelay = 500,
    dedupe = 'cancel',
    skipAuth = false,
    skipCsrf = false,
    withLoading = false,
    signal,
    ...fetchOptions
  } = options

  // Loading UI (optional)
  const loadingUI = withLoading ? useLoadingUI() : null

  // Generate cache key
  const cacheKey = key || `api:${method}:${url}:${JSON.stringify(query || {})}:${JSON.stringify(body || {})}`

  // Prepare fetch options
  const fetchConfig: any = {
    method,
    server,
    lazy,
    immediate,
    key: cacheKey,
    dedupe,
    ...fetchOptions
  }

  // Add query params
  if (query) {
    fetchConfig.query = query
  }

  // Add body
  if (body && method !== 'GET' && method !== 'DELETE') {
    fetchConfig.body = body
  }

  // Add timeout
  if (timeout && timeout > 0) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    fetchConfig.signal = signal || controller.signal

    // Cleanup timeout on response
    const originalOnResponse = fetchConfig.onResponse
    const originalOnResponseError = fetchConfig.onResponseError

    fetchConfig.onResponseError = (context: any) => {
      clearTimeout(timeoutId)
      if (originalOnResponseError) originalOnResponseError(context)
    }

    fetchConfig.onResponse = (context: any) => {
      clearTimeout(timeoutId)
      if (originalOnResponse) originalOnResponse(context)
    }
  }

  // Add retry logic (GET only by default)
  if (retry !== false && method === 'GET') {
    fetchConfig.retry = retry
    fetchConfig.retryDelay = retryDelay
  }

  // Transform function
  fetchConfig.transform = (data: ApiResponse<T>) => {
    return transformToApiResult<T>(data)
  }

  // Default function
  if (defaultFn) {
    fetchConfig.default = () => ({ data: defaultFn(), error: null })
  }

  // Watch dependencies
  if (watch) {
    fetchConfig.watch = watch
  }

  // Request interceptor
  fetchConfig.onRequest = async ({ options: requestOptions }: any) => {
    // Show loading
    if (loadingUI && !import.meta.server) {
      loadingUI.showLoading()
    }

    // Prepare headers
    requestOptions.headers = await prepareHeaders(method, {
      skipAuth,
      skipCsrf
    })
  }

  // Response interceptor
  fetchConfig.onResponse = ({ response }: any) => {
    // Hide loading
    if (loadingUI && !import.meta.server) {
      loadingUI.hideLoading()
    }

    // Handle special statuses
    if (response.status === 204) {
      response._data = { status: 'success', data: null }
    }
  }

  // Error interceptor
  fetchConfig.onResponseError = async ({ response }: any) => {
    // Hide loading
    if (loadingUI && !import.meta.server) {
      loadingUI.hideLoading()
    }

    // Auto token refresh on 401
    if (response?.status === 401 && !skipAuth) {
      const authStore = useAuthStore()

      try {
        const refreshed = await authStore.refreshToken()

        if (refreshed) {
          console.log('[API] Token refreshed, please retry manually')
        }
      } catch (err) {
        console.error('[API] Token refresh failed:', err)
      }
    }

    // Transform error to standard format
    const error = normalizeError(response)
    response._data = { data: null, error }
  }

  // Execute fetch
  const fullUrl = `${apiBase}/${url.replace(/^\//, '')}`
  return useFetch<ApiResult<T>>(fullUrl, fetchConfig)
}

// ===== 편의 함수 =====

export function useGet<T = unknown>(
  url: string,
  query?: Record<string, any>,
  options: Omit<ApiOptions, 'method'> = {}
) {
  return useApi<T>(url, { ...options, method: 'GET', query })
}

export function usePost<T = unknown>(
  url: string,
  body?: any,
  options: Omit<ApiOptions, 'method'> = {}
) {
  return useApi<T>(url, { ...options, method: 'POST', body })
}

export function usePut<T = unknown>(
  url: string,
  body?: any,
  options: Omit<ApiOptions, 'method'> = {}
) {
  return useApi<T>(url, { ...options, method: 'PUT', body })
}

export function usePatch<T = unknown>(
  url: string,
  body?: any,
  options: Omit<ApiOptions, 'method'> = {}
) {
  return useApi<T>(url, { ...options, method: 'PATCH', body })
}

export function useDelete<T = unknown>(
  url: string,
  options: Omit<ApiOptions, 'method'> = {}
) {
  return useApi<T>(url, { ...options, method: 'DELETE' })
}

