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
Frontend ──useApi──> /api/nestjs/* ──HTTP──> Backend
    ↓                       ↓                      ↓
useGet/Post            Proxy Handler         TransformInterceptor
    ↓                       ↓                      ↓
Auto: Auth/CSRF/       Header forwarding     { status, data }
      Loading/Error     Cookie forwarding
```

## Frontend API Pattern

### Core Composables
```typescript
// GET request
const { data, error } = await useGet<UserData>('auth/profile')

// POST request
const { data, error } = await usePost<LoginResponse>('auth/login', {
  email: 'user@example.com',
  password: 'password'
})
```

### Automatic Features
- **Authentication**: Bearer token auto-attached from Auth Store (see [Authentication Architecture](./auth-security-architecture.md))
- **CSRF Protection**: X-CSRF-Token header for POST requests (see [Authentication Architecture](./auth-security-architecture.md))
- **Loading States**: Global loading UI management
- **Error Handling**: 401 auto-retry with token refresh
- **Type Safety**: Generic `ApiResult<T>` pattern

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

### TransformInterceptor Implementation

**Location:** `src/common/interceptors/transform.interceptor.ts`

```typescript
export interface SuccessResponse<T = any> {
  status: 'success';
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        status: 'success',
        data,
      })),
    );
  }
}
```

### HttpExceptionFilter Implementation

**Location:** `src/common/filters/http-exception.filter.ts`

```typescript
export interface ErrorResponse {
  status: 'error';
  data: ErrorData;
}

export interface ErrorData {
  name: string;
  message: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const isDev = this.configService.get('NODE_ENV') !== 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let exceptionName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      exceptionName = exception.constructor.name;
      const exceptionResponse = exception.getResponse();

      // Handle different response types (string, object, validation arrays)
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const resObj = exceptionResponse as any;
        const raw = resObj.message ?? resObj.error ?? message;

        if (Array.isArray(raw)) {
          message = raw.every((v) => typeof v === 'string')
            ? raw.join(', ')
            : 'Validation failed';
        } else if (typeof raw === 'string') {
          message = raw;
        }
      }
    }

    // Hide internal errors in production
    if (!isDev && status >= 500) {
      message = 'Internal server error';
    }

    const errorResponse: ErrorResponse = {
      status: 'error',
      data: {
        name: exceptionName,
        message: message,
      },
    };

    response.status(status).json(errorResponse);
  }
}
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
    const { data } = await usePost<AuthResponse>('auth/login', loginData)
    if (data.value?.data) {
      setAuth(data.value.data)
      return true
    }
    return false
  }

  return { login, token: computed(() => accessToken.value) }
})
```

### Auto-Authentication in useApi
```typescript
// composables/api/useNuxtApi.ts - For complete implementation,
// see Frontend Patterns guide
export const useApi = async <T>(endpoint: string, options = {}) => {
  const authStore = useAuthStore()

  return useFetch<ApiResult<T>>(`/api/nestjs/${endpoint}`, {
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
    },

    transform: transformToApiResult<T>
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
export const normalizeError = (err: any): ApiError => {
  // Backend standard error format
  if (err?.data?.status === 'error' && err?.data?.data?.name) {
    return {
      code: err.data.data.name,
      message: err.data.data.message,
      details: err.data.data.details
    }
  }

  // Normalize other errors
  return {
    code: 'RequestError',
    message: err?.message || 'Request failed'
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

### CSR (Client-Side Rendering) Usage

#### Basic GET Request Pattern
```typescript
// pages/profile.vue (CSR page)
<script setup lang="ts">
interface UserProfile {
  idx: number
  email: string
  isActive: boolean
  createdAt: string
}

// Automatic JWT token attachment, error handling, loading UI
const { data, error, pending } = await useGet<UserProfile>('auth/profile')

// Reactive data usage
watchEffect(() => {
  if (data.value?.data) {
    console.log('User profile loaded:', data.value.data)
  }
  if (data.value?.error) {
    showNotification(data.value.error.message, 'error')
  }
})
</script>

<template>
  <div v-if="pending">Loading...</div>
  <div v-else-if="data?.data">
    <h1>Welcome, {{ data.data.email }}</h1>
    <p>Status: {{ data.data.isActive ? 'Active' : 'Inactive' }}</p>
  </div>
  <div v-else-if="data?.error">
    Error: {{ data.error.message }}
  </div>
</template>
```

#### POST Request with Form Handling
```typescript
// pages/login.vue (CSR page)
<script setup lang="ts">
interface LoginRequest {
  email: string
  password: string
}

interface AuthResponse {
  accessToken: string
  user: { idx: number; email: string }
}

const form = reactive<LoginRequest>({
  email: '',
  password: ''
})

const authStore = useAuthStore()
const router = useRouter()

const handleLogin = async () => {
  try {
    // Automatic CSRF token attachment, global loading display
    const { data, error } = await usePost<AuthResponse>('auth/login', form)

    if (data.value?.data) {
      // Success: Auth store automatically updated via interceptor
      await router.push('/dashboard')
    }

    if (data.value?.error) {
      // Error: Automatically normalized error format
      showNotification(data.value.error.message, 'error')
    }
  } catch (err) {
    console.error('Login failed:', err)
  }
}
</script>
```

#### Advanced Options Usage
```typescript
// Advanced API call with custom options
const { data, refresh, pending } = await useApi<SearchResults>('users/search', {
  method: 'GET',
  query: { page: 1, limit: 10, search: searchTerm },
  withLoading: true,        // Show global loading UI
  timeout: 15000,           // 15 second timeout
  retry: 3,                 // Retry 3 times on failure
  immediate: false,         // Manual execution
  key: 'user-search-cache', // Cache key for optimization
  watch: [searchTerm]       // Re-execute when searchTerm changes
})

// Manual execution when needed
await refresh()
```

### SSR (Server-Side Rendering) Usage

#### SSR Page with Initial Data
```typescript
// pages/dashboard.vue (SSR page)
<script setup lang="ts">
// Page metadata enables SSR (configured in nuxt.config.ts)
definePageMeta({
  middleware: 'auth',  // Authentication middleware
  title: 'Dashboard'
})

interface DashboardData {
  user: User
  stats: DashboardStats
  recentActivity: Activity[]
}

// SSR: Executed on server, provides initial data
const { data: dashboardData } = await useAsyncData('dashboard-overview', async () => {
  // Server-side cookie-based authentication automatically handled
  const { data } = await useGet<DashboardData>('dashboard/overview', {}, {
    server: true,        // Execute only on server
    lazy: false,         // Immediate loading
    default: () => null  // Default value during loading
  })

  return data.value?.data || null
})

// Client-side additional data loading
const { data: notifications, refresh: refreshNotifications } = await useGet<Notification[]>(
  'dashboard/notifications',
  { limit: 5 },
  {
    server: false,      // Execute only on client
    lazy: true,         // Lazy loading
    immediate: true     // Auto-execute when component mounts
  }
)

// Hybrid: Both server and client execution
const { data: preferences } = await useGet<UserPreferences>('user/preferences', {}, {
  server: true,       // Initial server load
  lazy: false,        // Immediate on server
  // Client-side cache revalidation on navigation
})

const authStore = useAuthStore()

onMounted(() => {
  // Client-only: Load additional profile data if needed
  if (authStore.isAuthenticated && !authStore.currentUser) {
    authStore.getProfile() // Uses JWT token automatically
  }
})
</script>

<template>
  <!-- Server-rendered initial content -->
  <div v-if="dashboardData">
    <h1>Dashboard</h1>
    <div class="stats">
      <div>Users: {{ dashboardData.stats.totalUsers }}</div>
      <div>Active: {{ dashboardData.stats.activeUsers }}</div>
    </div>

    <!-- Client-side loaded content -->
    <div class="notifications">
      <h2>Recent Notifications</h2>
      <div v-if="notifications?.data">
        <div v-for="notification in notifications.data" :key="notification.id">
          {{ notification.message }}
        </div>
      </div>
      <div v-else-if="notifications?.error">
        Failed to load notifications
      </div>
    </div>
  </div>
</template>
```

#### Hybrid Rendering Configuration
```typescript
// nuxt.config.ts - Rendering strategy
export default defineNuxtConfig({
  ssr: false, // Default CSR for all pages

  routeRules: {
    // SSR pages for SEO and initial load performance
    '/': { ssr: true, prerender: true },
    '/dashboard': { ssr: true },
    '/profile': { ssr: true },
    '/blog/**': {
      ssr: true,
      headers: { 'cache-control': 's-maxage=3600' }
    },

    // CSR pages for dynamic interaction
    '/login': {}, // Default CSR
    '/register': {}, // Default CSR
    '/admin/**': {}, // Default CSR

    // API proxy configuration
    '/api/nestjs/**': {
      cors: true,
      headers: { 'access-control-allow-credentials': 'true' }
    }
  }
})
```

### Component API Usage Patterns
```typescript
// 1. Define inline types in component
interface ComponentApiTypes {
  ProfileData: { idx: number; email: string; isActive: boolean }
  UpdateProfileRequest: { email?: string }
}

// 2. Use typed API calls
const { data: profile } = await useGet<ComponentApiTypes['ProfileData']>('auth/profile')

const updateProfile = async (updates: ComponentApiTypes['UpdateProfileRequest']) => {
  const { data, error } = await usePost<ComponentApiTypes['ProfileData']>('auth/profile', updates)
  if (data.value?.data) {
    // Handle success
  }
}
```

### Authentication Integration Patterns

#### Automatic Token Management
```typescript
// All API calls automatically include authentication
const { data } = await useGet<UserData>('protected/resource')
// ↑ Automatically includes: Authorization: Bearer <token>

// Skip authentication for public endpoints
const { data } = await useGet<PublicData>('public/content', {}, {
  skipAuth: true
})

// Skip CSRF for specific requests (mobile clients)
const { data } = await usePost<Result>('api/action', payload, {
  skipCsrf: true
})
```

#### Token Refresh Handling
```typescript
// Automatic token refresh on 401 responses
const authStore = useAuthStore()

// API call with expired token
const { data, error } = await useGet<UserData>('auth/profile')

// If 401 received:
// 1. authStore.refreshToken() automatically called
// 2. New token stored in memory
// 3. User prompted to retry the request manually
// 4. If refresh fails, redirected to login

if (data.value?.error && isAuthError(data.value.error)) {
  // Handle authentication failure
  await navigateTo('/login')
}
```

### Environment-Specific Usage

#### Development vs Production
```typescript
// Static resource access with environment detection
const config = useRuntimeConfig()

const getResourceUrl = (path: string) => {
  switch (config.public.NUXT_APP_ENVIRONMENT) {
    case 'production':
      return `${config.public.NUXT_CDN_BASE_URL}/data/${path}`
    default:
      return `/api/proxy/${path}` // Development proxy
  }
}

// Usage in component
const videoSrc = getResourceUrl('videos/demo.mp4')
```

### SSR vs CSR Considerations
- **SSR**: Server-side requests automatically include HttpOnly cookies
- **CSR**: Client-side requests use JWT tokens from memory/localStorage
- **Hybrid**: Initial SSR load with cookie auth, subsequent CSR calls with JWT
- **Security**: Private backend URLs resolved on server only
- **Performance**: SSR provides immediate content, CSR enables dynamic updates
- **SEO**: SSR pages fully indexed, CSR pages require additional meta handling

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