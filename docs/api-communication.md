# API Communication Architecture

## Overview

Modern Nuxt 4 + NestJS API communication with unified response format, automatic authentication, and security-enhanced proxy layer.

## Response Format Standard

### Success Response (TransformInterceptor)
```typescript
interface SuccessResponse<T> {
  status: 'success'
  data: T
}
```

### Error Response (HttpExceptionFilter)
```typescript
interface ErrorResponse {
  status: 'error'
  data: {
    name: string    // Exception class name
    message: string // User-friendly message
  }
}
```

## Architecture Flow

```
Frontend ──useNuxtApi──> /api/nestjs/* ──HTTP──> Backend
    ↓                       ↓                      ↓
useNuxtGet/Post        Proxy Handler         TransformInterceptor
    ↓                       ↓                      ↓
Auto: Auth/CSRF/       Header forwarding     { status, data }
      Loading/Error     Cookie forwarding
```

## Frontend API Pattern

### Core Composables
```typescript
// GET request
const { data, error } = await useNuxtGet<UserData>('auth/profile')

// POST request
const { data, error } = await useNuxtPost<LoginResponse>('auth/login', {
  email: 'user@example.com',
  password: 'password'
})
```

### Automatic Features
- **Authentication**: Bearer token auto-attached from Auth Store (see [Authentication Architecture](./auth-security-architecture.md))
- **CSRF Protection**: X-CSRF-Token header for POST requests (see [Authentication Architecture](./auth-security-architecture.md))
- **Loading States**: Global loading UI management
- **Error Handling**: 401 auto-retry with token refresh
- **Type Safety**: Generic `ApiResponse<T>` pattern

### Component Usage Example
```typescript
// pages/login.vue - For complete patterns, see Frontend Patterns guide
<script setup lang="ts">
interface LoginData {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  user: { idx: number; email: string }
}

const authStore = useAuthStore()

const handleLogin = async (formData: LoginData) => {
  const success = await authStore.login(formData)
  if (success) await router.push('/')
}
</script>
```

## Backend Response Processing

### TransformInterceptor (Success)
```typescript
// All successful responses wrapped automatically
return next.handle().pipe(
  map((data) => ({
    status: 'success',
    data
  }))
)
```

### HttpExceptionFilter (Error)
```typescript
// All errors normalized to standard format
const errorResponse = {
  status: 'error',
  data: {
    name: exception.constructor.name,
    message: userFriendlyMessage
  }
}
response.status(httpStatus).json(errorResponse)
```

### Controller Implementation
```typescript
// For complete backend patterns, see Backend Patterns guide
@Post('login')
@ApiResponse({ status: 200, type: AuthResponseDto })
async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
  const result = await this.authService.login(loginDto)
  return result // TransformInterceptor wraps this
}
```

## Proxy Implementation

### Environment Security
```typescript
// nuxt.config.ts
runtimeConfig: {
  // Private (server-only) - Hidden from client
  NEST_BACKEND_BASE_URL: process.env.NUXT_BACKEND_BASE_URL,

  // Public (client-safe)
  public: {
    NUXT_API_BASE_URL: '/api/nestjs',      // Proxy path only
    NUXT_CDN_BASE_URL: process.env.CDN_URL // Static resources
  }
}
```

### NestJS API Proxy (`/server/api/nestjs/[...path].ts`)
```typescript
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const method = getMethod(event)
  const body = method !== 'GET' ? await readBody(event) : null

  // Security headers only
  const forwardHeaders = {}
  const important = ['authorization', 'content-type', 'x-csrf-token', 'cookie']

  for (const header of important) {
    if (headers[header]) forwardHeaders[header] = headers[header]
  }

  const config = useRuntimeConfig()
  const response = await $fetch.raw(`${config.NEST_BACKEND_BASE_URL}/${path}`, {
    method, body, headers: forwardHeaders, timeout: 30000
  })

  // Forward cookies for auth
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) setResponseHeader(event, 'set-cookie', setCookie)

  return response._data
})
```

### CDN Proxy (`/server/api/proxy/[...path].ts`)
```typescript
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''

  // Range headers for streaming
  const forward = {}
  for (const h of ['range', 'if-none-match', 'accept']) {
    if (reqHeaders[h]) forward[h] = reqHeaders[h]
  }

  const config = useRuntimeConfig()
  const upstream = await fetch(`${config.public.NUXT_CDN_BASE_URL}/data/${path}`, {
    headers: forward
  })

  return upstream // Direct response forwarding
})
```

## Auth Integration

### Auth Store Pattern
```typescript
// stores/auth.ts - For complete auth store implementation,
// see Authentication & Security Architecture guide
export const useAuthStore = defineStore('auth', () => {
  const login = async (loginData: LoginData): Promise<boolean> => {
    const { data } = await useNuxtPost<AuthResponse>('auth/login', loginData)
    if (data.value?.status === 'success') {
      setAuth(data.value.data)
      return true
    }
    return false
  }

  return { login, token: computed(() => accessToken.value) }
})
```

### Auto-Authentication in useNuxtApi
```typescript
// composables/api/useNuxtApi.ts - For complete implementation,
// see Frontend Patterns guide
export const useNuxtApi = async <T>(endpoint: string, options = {}) => {
  const authStore = useAuthStore()

  return useFetch<ApiResponse<T>>(`/api/nestjs/${endpoint}`, {
    onRequest: async ({ options }) => {
      // Auto JWT + CSRF token injection
      const headers = await prepareAuthHeaders(authStore, options.body)
      options.headers = headers
    },

    onResponseError: async ({ response }) => {
      // Auto token refresh on 401
      if (response?.status === 401) {
        await authStore.refreshToken()
      }
    }
  })
}
```

## Security Features

For complete security implementation details, see [Authentication & Security Architecture](./auth-security-architecture.md).

### CSRF Protection
- **Web clients**: X-CSRF-Token header required for POST/PUT/DELETE
- **Mobile clients**: Automatically bypassed via X-Client-Type: mobile
- **Token lifecycle**: 10-minute expiration with auto-refresh

### Token Management
- **Access Token**: 15-minute expiration, stored in memory only
- **Refresh Token**: 12-hour expiration, HttpOnly cookie (web) or secure storage (mobile)
- **Auto-refresh**: Transparent token renewal on 401 errors

### Rate Limiting
```typescript
// Backend throttling per endpoint
@Throttle({ login: { ttl: 60000, limit: 10 } })        // 10/min
@Throttle({ register: { ttl: 60000, limit: 5 } })      // 5/min
@Throttle({ refresh: { ttl: 60000, limit: 20 } })      // 20/min
```

## Error Handling

### Frontend Error Processing
```typescript
// composables/utils/useApiHelper.ts
export const normalizeError = <T>(err: any): ApiResponse<T> => {
  // Backend standard error format
  if (err?.data?.status === 'error' && err?.data?.data?.name) {
    return err.data as ApiResponse<T>
  }

  // Normalize other errors
  return {
    status: 'error',
    data: {
      name: 'RequestError',
      message: err?.message || 'Request failed'
    }
  }
}

export const isCsrfError = (err: any): boolean => {
  return err?.status === 403 ||
         err?.data?.data?.message?.toLowerCase().includes('csrf')
}

export const isAuthError = (err: any): boolean => {
  return err?.status === 401 ||
         err?.data?.data?.name?.toLowerCase().includes('unauthorized')
}
```

## Development Patterns

### Component API Usage
```typescript
// 1. Define inline types in component
interface ComponentApiTypes {
  ProfileData: { idx: number; email: string; isActive: boolean }
  UpdateProfileRequest: { email?: string }
}

// 2. Use typed API calls
const { data: profile } = await useNuxtGet<ComponentApiTypes['ProfileData']>('auth/profile')

const updateProfile = async (updates: ComponentApiTypes['UpdateProfileRequest']) => {
  const { data, error } = await useNuxtPost<ComponentApiTypes['ProfileData']>('auth/profile', updates)
  if (data.value?.status === 'success') {
    // Handle success
  }
}
```

### SSR Considerations
- Server-side requests automatically include credentials
- Private backend URLs resolved on server only
- Client hydration preserves auth state
- No secrets exposed in client bundles

## Performance Optimizations

### Loading Management
- Global loading UI via `useLoadingUI()`
- Automatic show/hide on request lifecycle
- No manual loading state management required

### Caching Strategy
- GET requests cached via `useFetch` with smart keys
- Auth state persistence across page reloads
- CSRF token caching with 10-minute TTL

### Bundle Security
- Backend URLs never included in client bundle
- Proxy paths only (`/api/nestjs/*`) exposed to client
- Environment-specific configuration without client exposure

---

## Related Documents

- [Authentication & Security Architecture](./auth-security-architecture.md) - Complete JWT/CSRF authentication system
- [Frontend Patterns (Nuxt 4)](./frontend-patterns.md) - Nuxt 4 development patterns and composables
- [Backend Patterns (NestJS)](./backend-patterns.md) - NestJS development patterns and best practices
- [Mobile Authentication Guide](./mobile-authentication.md) - Mobile app-specific authentication setup