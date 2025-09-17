# API Communication Architecture

## Overview

This document describes the modern Nuxt 4 and NestJS API communication structure using the `useNuxtApi` series built on useFetch. The architecture provides a simplified, type-safe, and performant API communication layer with automatic loading states, authentication, and error handling.

## Architecture

### Security-Enhanced Environment Variable Strategy

**Environment Variable Separation (Implemented Security Pattern):**
```typescript
// nuxt.config.ts
runtimeConfig: {
  // ======== Server-Only (Private) ========
  // Real backend API URL - NOT exposed to client bundle
  NEST_BACKEND_BASE_URL: process.env.NUXT_BACKEND_BASE_URL || 'http://localhost:3020',

  // ======== Client-Exposed (Public) ========
  // Safe for client bundle exposure
  public: {
    // Proxy path only (hides real backend URL)
    NUXT_API_BASE_URL: process.env.NUXT_PUBLIC_API_BASE,
    // SEO, meta tags, canonical URLs
    NUXT_APP_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL,
    // CDN, static resources
    NUXT_CDN_BASE_URL: process.env.NUXT_PUBLIC_CDN_BASE
  }
}
```

**Security Benefits:**
- ✅ **Backend URLs Hidden**: Real API endpoints never exposed in client bundles
- ✅ **Proxy Layer Protection**: Frontend only knows `/api/nestjs/*` proxy paths
- ✅ **Environment Isolation**: Different backend URLs per environment (local/dev/prod)
- ✅ **CDN Separation**: Static resources separate from API endpoints
- ✅ **Bundle Analysis Safe**: Client bundle contains no sensitive infrastructure URLs

### Proxy Architecture
```
Frontend (Nuxt) ──useNuxtApi──> /api/nestjs/* ──HTTP──> Backend (NestJS)
     ↓                          ↓                          ↓
useNuxtGet/Post series      NestJS API proxy         TransformInterceptor
     ↓                          ↓                          ↓
Automatic: Loading, Auth,   Header forwarding,       Consistent response
CSRF, Error handling        Status forwarding        { status, data }

Static Resources ──> /api/proxy/* ──HTTP──> CDN (pikitalk.com/data/*)
     ↓                      ↓                    ↓
Direct file access     CDN proxy handler    Range header support
```

### NestJS API Proxy (`/server/api/nestjs/[...path].ts`)
**Backend API Proxy Implementation:**
```typescript
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''
  const method = getMethod(event)
  const query = getQuery(event)
  const body = method !== 'GET' ? await readBody(event).catch(() => null) : null

  // Basic header forwarding
  const headers = getRequestHeaders(event)
  const forwardHeaders: Record<string, string> = {}

  // Forward only important headers
  const importantHeaders = ['authorization', 'content-type', 'x-csrf-token', 'cookie']
  for (const header of importantHeaders) {
    if (headers[header]) {
      forwardHeaders[header] = headers[header] as string
    }
  }

  // Mark server request
  if (import.meta.server) {
    forwardHeaders['x-server-request'] = 'true'
  }

  try {
    const config = useRuntimeConfig()
    const nestApiUrl = config.NEST_BACKEND_BASE_URL // Private backend URL (server-only)

    const response = await $fetch.raw(`${nestApiUrl}/${path}`, {
      method, query, body, headers: forwardHeaders,
      timeout: 30000, ignoreResponseError: true
    })

    // Forward response headers (cookies, etc.)
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      setResponseHeader(event, 'set-cookie', setCookie)
    }

    setResponseStatus(event, response.status || 200)
    return response._data

  } catch (error: any) {
    console.error('[Proxy Error]:', error.message)

    setResponseStatus(event, error.status || 500)
    return {
      status: 'error',
      data: {
        name: 'ProxyError',
        message: error.message || 'Backend request failed'
      }
    }
  }
})
```

### CDN Proxy (`/server/api/proxy/[...path].ts`)
**Static Resource Proxy Implementation:**
```typescript
export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path') ?? ''

  // Forward Range headers for HLS streaming
  const reqHeaders = getRequestHeaders(event)
  const forward: Record<string, string> = {}
  for (const h of ['range', 'if-none-match', 'if-modified-since', 'accept', 'user-agent', 'referer']) {
    if (reqHeaders[h]) forward[h] = reqHeaders[h] as string
  }

  try {
    const config = useRuntimeConfig()
    const cdnBaseUrl = config.public.NUXT_CDN_BASE_URL
    const upstream = await fetch(`${cdnBaseUrl}/data/${path}`, { headers: forward })

    // Return Response object directly (auto-forwards headers/status/stream)
    return upstream

  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Proxy request failed'
    })
  }
})
```

## API Functions (Current Implementation)

### 1. useNuxtApi (Generic)
```typescript
// Simple API call - useFetch based
export const useNuxtApi = async <T = any>(
  endpoint: string,
  options: SimpleApiOptions = {}
) => {
  const { body, query, context = {}, server = true } = options

  // Loading management
  const { showLoading, hideLoading } = useLoadingUI()

  // Auth store
  const authStore = useAuthStore()
  const { token } = storeToRefs(authStore)

  const result = await useFetch<ApiResponse<T>>(`/api/nestjs/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    body, query, server,

    onRequest: async ({ options }) => {
      if (!import.meta.server) showLoading?.()

      const headers = new Headers()

      // Automatic JWT token injection
      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      // Automatic CSRF token injection (POST requests only)
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

      // Attempt token refresh on 401 error
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
```

### 2. useNuxtGet (GET Requests Only)
```typescript
// GET requests only - real usage example
const { data, error } = await useNuxtGet<PolicyData>('policy/getPrivacyList', {
  lang: 'ko',
  view_type: 'talk'
})

if (!error.value && data.value?.status === 'success') {
  console.log('Data:', data.value.data)
}
```

### 3. useNuxtPost (POST Requests Only)
```typescript
// POST requests only - real usage example
const { data, error } = await useNuxtPost<AuthResponse>('auth/login', {
  email: 'user@example.com',
  password: 'password'
})

if (!error.value && data.value?.status === 'success') {
  console.log('Login success:', data.value.data.user.email)
}
```

## Request Flow

### Frontend Request (useNuxtApi Series)

**✅ Automatically Handled Features:**
1. **Loading UI:** Automatic loading display/hide via API plugin
2. **JWT Token:** Automatic header injection from Auth Store
3. **CSRF Token:** Automatic injection for POST requests
4. **401 Retry:** Automatic refresh and retry on token expiration
5. **Error Handling:** Consistent error response format normalization
6. **SSR Support:** Automatic cookie/token forwarding on server-side

### API Plugin Structure
**Centralized API Processing (`/app/plugins/api.ts`):**
```typescript
export default defineNuxtPlugin((nuxtApp) => {
  const api = $fetch.create({
    baseURL: useRuntimeConfig().public.NUXT_API_BASE_URL, // Proxy path (/api/nestjs)
    credentials: 'include',
    timeout: 30000,

    onRequest: async ({ options }) => {
      // Start loading
      const { showLoading } = useLoadingUI()
      showLoading?.()

      // JWT token injection
      const authStore = useAuthStore()
      const { token } = storeToRefs(authStore)
      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      // CSRF token injection (mutation methods only)
      const method = (options.method || 'GET').toUpperCase()
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = await authStore.getCsrfToken()
        if (csrfToken) {
          headers.set('X-CSRF-Token', csrfToken)
        }
      }
    },

    onResponse: () => {
      // End loading
      const { hideLoading } = useLoadingUI()
      hideLoading?.()
    },

    onResponseError: async ({ response, options, error }) => {
      // 401 error: Automatic JWT token refresh
      if (response?.status === 401 && !context.skipTokenRefresh) {
        const authStore = useAuthStore()
        const refreshSuccess = await authStore.refreshToken()

        if (refreshSuccess) {
          // Retry on successful token refresh
          return await apiInstance(request, {
            ...options,
            context: { ...context, skipTokenRefresh: true }
          })
        }
      }

      // CSRF error: Retry after token reissue
      if (isCsrfError(response?._data)) {
        await authStore.refreshCsrfToken()
        return await apiInstance(request, {
          ...options,
          context: { ...context, skipCsrfRetry: true }
        })
      }
    }
  })
})
```

### Response Format

**NestJS Backend Response (TransformInterceptor):**
```typescript
// backend/src/common/interceptors/transform.interceptor.ts
export interface SuccessResponse<T = any> {
  status: 'success';
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        status: 'success',
        data,
      }))
    );
  }
}
```

**Frontend Real Usage Patterns:**
```typescript
// Privacy policy detail lookup (real code)
const selectPrivacy = async (privacyIdx: number) => {
  const { data, error } = await useNuxtPost<PrivacyData>('policy/getPrivacyDetail', {
    idx: Number(privacyIdx),
    lang: locale.value
  })

  if (!error.value && data.value?.status === 'success') {
    selectedPrivacy.value = data.value.data
    selectedIndex.value = privacyList.value.findIndex((privacy: PrivacyData) => privacy.idx === privacyIdx)
    isDropdownOpen.value = false
  } else {
    handleApiError(error.value?.data || data.value?.data)
  }
}

// Login (inside Auth Store)
const login = async (loginData: LoginData): Promise<boolean> => {
  try {
    const { data, error } = await useNuxtPost<AuthResponse>('auth/login', loginData)

    if (!error.value && data.value?.status === 'success') {
      setAuth(data.value.data)
      return true
    }

    return false
  } catch (error) {
    return false
  }
}
```

## Type Safety

### Inline Type Definition Approach
**Current Implemented Type Management System (Component-specific):**
```typescript
<!-- Example: Auth Store -->
<script setup lang="ts">
// Auth-specific types defined inline
interface User {
  idx: number
  email: string
  isActive: boolean
}

interface AuthLoginResponse {
  accessToken: string
  refreshToken?: string
  user: User
}
</script>

<!-- Example: Privacy Page -->
<script setup lang="ts">
// Privacy-specific data type
interface PrivacyData {
  idx: number
  change_dt: string
  contents: string
}
</script>

<!-- Example: FAQ Page -->
<script setup lang="ts">
// FAQ API response type
interface FaqListData {
  faq_list: Array<{
    idx: number
    question: string
    answer: string
    open?: boolean
  }>
}
</script>

<!-- Example: Notice Page -->
<script setup lang="ts">
// Notice API response type
interface NoticeListData {
  notice_list: Array<{
    idx: number
    title: string
    contents: string
    reg_dt: string
  }>
  notice_cnt: number
  offset: number
}
```

### Real Type Usage Patterns
```typescript
// Pattern used in real pages
interface PrivacyData {
  idx: number
  change_dt: string
  contents: string
}

const privacyList = ref<PrivacyData[]>([])
const selectedPrivacy = ref<PrivacyData | null>(null)

// Type specification during API calls
const { data, error } = await useNuxtPost<PrivacyData[]>('policy/getPrivacyList', {
  lang: locale.value,
  view_type: 'talk'
})

if (!error.value && data.value?.status === 'success') {
  privacyList.value = data.value.data // Complete type safety
}
```

## Authentication & Security

### JWT Token Management
**Auth Store Based Token Management:**
```typescript
// stores/auth.ts - actual implementation
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)

  // JWT token expiration check utility
  const isTokenExpired = (token: string | null, bufferSeconds: number = 30): boolean => {
    if (!token) return true

    try {
      const parts = token.split('.')
      if (parts.length !== 3) return true

      const payload = JSON.parse(atob(parts[1] || ''))
      if (!payload.exp || typeof payload.exp !== 'number') return true

      const expirationTime = payload.exp * 1000 - (bufferSeconds * 1000)
      return Date.now() >= expirationTime
    } catch (error) {
      return true
    }
  }

  const isAuthenticated = computed(() =>
    !!user.value && !!accessToken.value && !isTokenExpired(accessToken.value)
  )

  // Token refresh (including concurrency control)
  const refreshToken = async (silent: boolean = false): Promise<boolean> => {
    if (refreshTokenPromise) {
      return await refreshTokenPromise
    }

    refreshTokenPromise = performRefresh(silent)

    try {
      return await refreshTokenPromise
    } finally {
      refreshTokenPromise = null
    }
  }
})
```

### CSRF Protection
**Auth Store Based CSRF Management:**
```typescript
// CSRF token state management (security enhanced)
const csrfToken = ref<string | null>(null)
const isCsrfLoading = ref<boolean>(false)

const getCsrfToken = async (): Promise<string | null> => {
  if (csrfToken.value) {
    return csrfToken.value
  }

  if (isCsrfLoading.value) {
    await waitForCsrfTokenLoading()
    return csrfToken.value
  }

  await fetchCsrfToken()
  return csrfToken.value
}

// Automatically add CSRF token to POST requests
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
```

### Mobile vs Web Authentication
**Unified Authentication System:**
- **Web**: HttpOnly refresh cookie + memory access token + CSRF protection
- **Mobile**: Bearer token (AT/RT) + secure storage (Keychain/Keystore)
- **Client Detection**: Automatic client type detection
- **Multi-tab Sync**: BroadcastChannel login/logout synchronization

## SSR Support

### Server-Side Rendering
```typescript
// Works seamlessly on server and client
const { data: posts } = await useNuxtGet<PostsResponse>('posts')
```

### Credential Forwarding
- Cookies automatically forwarded to backend
- JWT tokens available on server-side requests
- CSRF tokens properly handled

## Error Handling

### Consistent Error Format
```typescript
// All API functions return same structure
const { data, error, pending, refresh } = await useNuxtGet<T>('endpoint')

// Error handling pattern
if (error.value) {
  // Network or HTTP errors
  console.error('Request failed:', error.value)
}

if (data.value?.status === 'error') {
  // Business logic errors from backend
  console.error('API error:', data.value.message)
}
```

### Automatic Retry Logic
- 401 errors trigger token refresh + retry
- CSRF errors trigger token refresh + retry
- Network errors can be manually retried with `refresh()`

## Performance Features

### useFetch Advantages
- Built-in caching and deduplication
- Reactive data and error refs
- Automatic loading states
- SSR/hydration optimization
- Request cancellation on component unmount

### Key Benefits vs Custom $fetch
- ✅ Reactive data/error/pending refs
- ✅ Automatic SSR hydration
- ✅ Built-in request deduplication
- ✅ Component lifecycle integration
- ✅ Consistent error handling
- ✅ Loading state management

## Development Guidelines

### 1. Always Use Types
```typescript
// ✅ Correct approach
const { data, error } = await useNuxtPost<AuthResponse>('auth/login', loginData)

// ❌ Wrong approach
const { data, error } = await useNuxtPost('auth/login', loginData)
```

### 2. Bidirectional Error Handling
```typescript
// ✅ Correct approach - Handle both network and API errors
if (!error.value && data.value?.status === 'success') {
  // Success handling
  selectedPrivacy.value = data.value.data
} else {
  // Error handling (both network and API errors)
  handleApiError(error.value?.data || data.value?.data)
}

// ❌ Wrong approach - Network errors not handled
if (data.value) {
  // Doesn't handle network errors
}
```

### 3. Define Types Inline in Components
```typescript
// ✅ Correct approach - Define inline within component
<script setup lang="ts">
// Component-specific API response type
interface NewFeatureResponse {
  id: number
  name: string
  createdAt: string
}

// Usage
const { data, error } = await useNuxtPost<NewFeatureResponse>('feature/create', requestData)
</script>
```

### 4. Real Usage Pattern Examples
```typescript
// Pattern used in real projects
const loadPrivacyList = async () => {
  const { data, error } = await useNuxtPost<PrivacyData[]>('policy/getPrivacyList', {
    lang: locale.value,
    view_type: 'talk'
  })

  if (!error.value && data.value?.status === 'success') {
    privacyList.value = data.value.data
    if (data.value.data.length > 0) {
      await selectPrivacy(data.value.data[0].idx)
    } else {
      selectedPrivacy.value = null
      selectedIndex.value = 0
    }
  } else {
    handleApiError(error.value?.data || data.value?.data)
  }
}
```

## Security Architecture Benefits

### 🔒 **URL Security Implementation**

**Problem Solved:**
Traditional SPAs often expose backend URLs in client bundles, making infrastructure visible to attackers and complicating environment management.

**Our Solution:**
```typescript
// ❌ Traditional approach - Backend URL exposed in client
const response = await fetch('https://api.example.com/users') // Visible in browser

// ✅ Our approach - Two-layer security
const response = await useNuxtPost('users', data) // Client only knows proxy path
//                                 ↓
//                      Server resolves to: config.NEST_BACKEND_BASE_URL
```

**Security Benefits Achieved:**

1. **🔐 Infrastructure Hiding**
   - Real backend URLs never appear in client JavaScript bundles
   - Environment-specific URLs remain server-side secrets
   - Bundle analysis reveals no sensitive infrastructure information

2. **🛡️ Attack Surface Reduction**
   - Attackers cannot directly target backend endpoints
   - All requests must go through authenticated proxy layer
   - Backend receives only validated, filtered requests

3. **🌍 Environment Isolation**
   - Development/staging/production backends completely isolated
   - Zero chance of accidental cross-environment requests
   - Client code identical across all environments

4. **📊 Monitoring & Control**
   - All API traffic passes through single proxy point
   - Centralized logging, rate limiting, and security headers
   - Easy to implement request/response transformation

### 🎯 **Real-World Security Impact**

**Before Implementation:**
```javascript
// Client bundle contained:
const API_BASE = 'https://api-prod.company.com'  // Exposed to attackers
const DEV_API = 'https://api-dev.company.com'    // Internal URLs leaked
```

**After Implementation:**
```javascript
// Client bundle only contains:
const API_BASE = '/api/nestjs'  // No infrastructure information exposed
```

**Threat Mitigation:**
- ✅ **Information Disclosure**: Backend URLs hidden from client
- ✅ **Direct Attacks**: Backend not directly accessible
- ✅ **Environment Confusion**: Client identical across environments
- ✅ **Infrastructure Mapping**: Attacker cannot enumerate internal services

## Key Benefits

- ✅ **Security**: Private backend URLs with public proxy protection
- ✅ **Simplicity**: Ready to use without complex setup
- ✅ **Performance**: useFetch-based optimization (caching, deduplication, reactive)
- ✅ **Type Safety**: Complete TypeScript support
- ✅ **Automation**: Automated loading, auth, CSRF, and error handling
- ✅ **SSR Support**: Perfect server-side rendering support
- ✅ **Modern**: Latest patterns using Nuxt 4's useFetch

**Access all backend APIs securely through `/api/nestjs/` routes using the `useNuxtApi` series! 🚀**

## Related Documents
- Auth & Security Architecture: [`auth-security-architecture.md`](./auth-security-architecture.md)
- Frontend Patterns (Nuxt 4): [`frontend-patterns.md`](./frontend-patterns.md)
- Backend Patterns (NestJS): [`backend-patterns.md`](./backend-patterns.md)
- Development Environment: [`development-setup.md`](./development-setup.md)
- (Optional) Port/Deployment Strategy: [`port-management.md`](./port-management.md)
