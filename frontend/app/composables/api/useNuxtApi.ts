// composables/api/useNuxtApi.ts
/**
 * Nuxt 4 API 컴포저블
 * 기존 useApi와 유사하지만 useFetch 기반
 */

import type { ApiResponse, ApiContextFlags } from '../utils/useApiHelper'

interface SimpleApiOptions {
  body?: any
  query?: any
  context?: ApiContextFlags
  server?: boolean
}

/**
 * API 호출 - useFetch 기반
 */
export const useNuxtApi = async <T = any>(
  endpoint: string,
  options: SimpleApiOptions = {}
) => {
  const {
    body,
    query,
    context = {},
    server = true
  } = options

  // 로딩 관리
  const { showLoading, hideLoading } = useLoadingUI()
  
  // Auth store
  const authStore = useAuthStore()
  const { token } = storeToRefs(authStore)

  const result = await useFetch<ApiResponse<T>>(`/api/nestjs/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    body,
    query,
    server,
    
    onRequest: async ({ options }) => {
      if (!import.meta.server) showLoading?.()
      
      const headers = new Headers()
      
      // JWT 토큰
      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }
      
      // CSRF 토큰 (POST 요청시만)
      if (body && !context.skipCsrf) {
        try {
          const csrfToken = await authStore.getCsrfToken()
          if (csrfToken) {
            headers.set('X-CSRF-Token', csrfToken)
          }
        } catch (e) {
          console.warn('CSRF token failed:', e)
        }
      }
      
      options.headers = headers
    },

    onResponse: () => {
      if (!import.meta.server) hideLoading?.()
    },

    onResponseError: async ({ response }) => {
      if (!import.meta.server) hideLoading?.()
      
      // 401 에러시 토큰 리프레시 시도
      if (response?.status === 401 && !context.skipTokenRefresh) {
        try {
          await authStore.refreshToken()
        } catch (e) {
          console.error('Token refresh failed:', e)
        }
      }
    }
  })

  return result
}

/**
 * GET 요청 전용
 */
export const useNuxtGet = <T = any>(
  endpoint: string,
  query?: any,
  options: Omit<SimpleApiOptions, 'body' | 'query'> = {}
) => {
  return useNuxtApi<T>(endpoint, { ...options, query })
}

/**
 * POST 요청 전용  
 */
export const useNuxtPost = <T = any>(
  endpoint: string,
  body?: any,
  options: Omit<SimpleApiOptions, 'body'> = {}
) => {
  return useNuxtApi<T>(endpoint, { ...options, body })
}