# Frontend Patterns Guide

This document outlines the architectural patterns and conventions used in the Nuxt 4 frontend application.

## Architecture Overview

### Technology Stack
- **Framework**: Nuxt 4.1.1 with Vue 3.5.21
- **State Management**: Pinia 3.0.3 with readonly pattern
- **TypeScript**: Strict mode with explicit interfaces
- **Styling**: CSS variables with scoped styles
- **Internationalization**: 15 languages support
- **Build**: SSR/CSR hybrid with code splitting

### Directory Structure
```
app/
├── components/          # Vue components (PascalCase + Component suffix)
│   ├── auth/           # Authentication-related components
│   ├── common/         # Reusable UI components
│   └── community/      # Feature-specific components
├── composables/        # Reusable composition functions
│   ├── api/           # API-related composables
│   ├── ui/            # UI state management
│   └── utils/         # Utility functions
├── pages/             # File-based routing
├── stores/            # Pinia state stores
├── middleware/        # Route middleware
├── plugins/           # Nuxt plugins
└── layouts/           # Layout components
```

## Component Patterns

### Component Structure
All components follow the `<script setup>` → `<template>` → `<style scoped>` pattern:

```vue
<script setup lang="ts">
// 1. Interface definitions
interface LoginData {
  email: string;
  password: string;
}

// 2. Props and emits
defineEmits<{
  'switch-to-register': []
}>()

// 3. Composables and stores
const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n()

// 4. Reactive state
const formData = ref<LoginData>({
  email: '',
  password: ''
})

// 5. Computed properties
const isFormValid = computed(() => {
  return formData.value.email &&
         formData.value.password &&
         formData.value.email.includes('@')
})

// 6. Methods
const handleSubmit = async () => {
  if (!isFormValid.value) return
  const success = await authStore.login(formData.value)
  if (success) {
    await router.push('/')
  }
}
</script>

<template>
  <!-- Semantic HTML with accessibility -->
  <form @submit.prevent="handleSubmit">
    <input
      id="email"
      v-model="formData.email"
      type="email"
      autocomplete="email"
      required
      :placeholder="t('email_placeholder')"
    />
  </form>
</template>

<style scoped>
/* CSS variables and utility classes */
.auth-input {
  border: 1px solid var(--gray_d);
  font-size: var(--txt14);
  color: var(--black);
}
</style>
```

### Naming Conventions
- **Components**: PascalCase with `Component` suffix (`LoginFormComponent.vue`)
- **Files**: kebab-case (`login-form-component.vue`)
- **Props/Events**: camelCase with TypeScript interfaces
- **CSS Classes**: kebab-case with BEM-inspired structure

## Composables Organization

### API Composables
Located in `composables/api/`, these handle all backend communication:

```typescript
// composables/api/useNuxtApi.ts (Now contains useApi, useGet, usePost)
export const useApi = async <T = any>(
  endpoint: string,
  options: ApiOptions = {}
) => {
  const config = useRuntimeConfig()
  const apiBasePath = config.public.NUXT_API_BASE_URL
  const authStore = useAuthStore()
  const { token } = storeToRefs(authStore)

  return await useFetch<ApiResult<T>>(`${apiBasePath}/${endpoint}`, {
    method: options.method || 'GET',
    body: options.body,
    query: options.query,
    server: options.server,
    onRequest: async ({ options: fetchOptions }) => {
      const headers = new Headers()

      // JWT Token
      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      // CSRF Token for POST requests
      if (options.body && !options.skipCsrf) {
        const csrfToken = await authStore.getCsrfToken()
        if (csrfToken) {
          headers.set('X-CSRF-Token', csrfToken)
        }
      }

      fetchOptions.headers = headers
    },
    transform: transformToApiResult<T>
  })
}

// Convenience methods
export const useGet = <T = any>(endpoint: string, query?: any, options: Omit<ApiOptions, 'method'> = {}) => {
  return useApi<T>(endpoint, { ...options, method: 'GET', query })
}

export const usePost = <T = any>(endpoint: string, body?: any, options: Omit<ApiOptions, 'method'> = {}) => {
  return useApi<T>(endpoint, { ...options, method: 'POST', body })
}
```

### UI Composables
Manage global UI state with readonly pattern:

```typescript
// composables/ui/useCommonUI.ts
const _activeLayer = ref<number | string | null>(null)
const _showToast = ref(false)
const _toastMessage = ref('')

export const openLayer = (layerNum: number | string): void => {
  _activeLayer.value = layerNum
}

export const closeLayer = (): void => {
  _activeLayer.value = null
}

export const showToastMessage = (message: string) => {
  if (!message.trim()) return
  _toastMessage.value = message
  _showToast.value = true
  setTimeout(() => {
    _showToast.value = false
    _toastMessage.value = ''
  }, 1500)
}

// Export readonly refs
export const activeLayer = readonly(_activeLayer)
export const showToast = readonly(_showToast)
export const toastMessage = readonly(_toastMessage)
```

### Utility Composables
Located in `composables/utils/`, handle cross-cutting concerns like SEO, CSRF, and common utilities.

## State Management with Pinia

### Store Structure
Stores follow the composition API pattern with readonly state:

```typescript
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  // Private state
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const csrfToken = ref<string | null>(null)

  // Computed properties
  const isAuthenticated = computed(() =>
    !!user.value && !!accessToken.value && !isTokenExpired(accessToken.value)
  )

  const currentUser = computed(() => user.value)
  const token = computed(() => accessToken.value)

  // Actions
  const login = async (loginData: LoginData): Promise<boolean> => {
    const { data, error } = await usePost<AuthResponse>('auth/login', loginData)
    if (!error.value && data.value?.data) {
      setAuth(data.value.data)
      return true
    }
    return false
  }

  // Return readonly state and actions
  return {
    user: readonly(user),
    accessToken: readonly(accessToken),
    csrfToken: readonly(csrfToken),
    isAuthenticated,
    currentUser,
    token,
    login,
    logout,
    refreshToken,
    initializeAuth
  }
})
```

### Store Patterns
- **Readonly State**: All state is exposed as readonly to prevent direct mutations
- **Computed Properties**: Derived state using computed properties
- **Async Actions**: Handle API calls with proper error handling
- **Token Management**: JWT tokens with automatic expiration checking
- **CSRF Protection**: Automatic CSRF token management for security

## Authentication Patterns

### Dual Authentication System
The application supports both web and mobile authentication:

- **Web**: HttpOnly cookies + CSRF double-submit pattern
- **Mobile**: Bearer tokens with JWT

### Token Management
```typescript
// JWT token expiration checking
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

// Automatic token refresh with concurrency control
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
```

### CSRF Protection
```typescript
// CSRF token management with automatic refresh
const getCsrfToken = async (): Promise<string | null> => {
  if (csrfToken.value) return csrfToken.value

  if (isCsrfLoading.value) {
    await waitForCsrfTokenLoading()
    return csrfToken.value
  }

  await fetchCsrfToken()
  return csrfToken.value
}
```

## API Communication Patterns

### Unified API Layer
All API calls go through the custom composables:

```typescript
// In components
const { data, error } = await useGet<UserProfile>('auth/profile')
const { data, error } = await usePost<AuthResponse>('auth/login', {
  email: 'user@example.com',
  password: 'password'
})
```

### Error Handling
- **401 Errors**: Automatic token refresh attempt
- **CSRF Errors**: Automatic CSRF token refresh
- **Network Errors**: Graceful degradation with user feedback
- **Loading States**: Global loading management

### Type Safety
Inline TypeScript interfaces are used for API responses:

```typescript
interface ApiResult<T = any> {
  data: T | null
  error: {
    code: string
    message: string
    details?: Record<string, any>
  } | null
}

interface AuthResponse {
  accessToken: string
  user: User
}
```

## Page Patterns

### Page Structure
Pages use `definePageMeta` for configuration:

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  title: 'Dashboard',
  description: 'User dashboard page'
})

// Page-specific logic
const authStore = useAuthStore()
const recentActivities = ref([...])

// Lifecycle management
onMounted(() => {
  const interval = setInterval(updateSessionTime, 1000)
  onUnmounted(() => clearInterval(interval))
})
</script>
```

### SEO and Meta Tags
SEO is handled through the `useSEO` composable for consistent meta tag management.

## Styling Patterns

### CSS Variables System
```css
:root {
  --color-primary: #4f46e5;
  --color-gray-50: #f9fafb;
  --color-gray-900: #111827;
  --txt14: 0.875rem;
  --txt24: 1.5rem;
  --weight700: 700;
}
```

### Component Styling
- **Scoped Styles**: All component styles are scoped
- **CSS Variables**: Consistent design tokens
- **Mobile-First**: Responsive design with progressive enhancement
- **Utility Classes**: Minimal utility classes for common patterns

### Responsive Design
```css
/* Mobile-first approach */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-cards {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

## Security Patterns

### Environment Variable Management
```typescript
// nuxt.config.ts
runtimeConfig: {
  // Server-only (private) - NOT exposed to client
  NEST_BACKEND_BASE_URL: process.env.NUXT_BACKEND_BASE_URL,

  // Client-exposed (public) - Safe for bundles
  public: {
    NUXT_API_BASE_URL: '/api/nestjs',        // Proxy only
    NUXT_APP_SITE_URL: process.env.NUXT_PUBLIC_SITE_URL,
    NUXT_CDN_BASE_URL: process.env.NUXT_PUBLIC_CDN_BASE
  }
}
```

### API Proxy Pattern
Real backend URLs are hidden behind proxy paths:
- Client sees: `/api/nestjs/*`
- Server forwards to: `http://localhost:3020/*`

## Internationalization Patterns

### Multi-Language Support
The application supports 15 languages with:

```typescript
// nuxt.config.ts
i18n: {
  locales: [
    {code: 'ko', language: 'ko-KR', file: 'ko.json'},
    {code: 'en', language: 'en-US', file: 'en.json'},
    // ... 13 more languages
  ],
  defaultLocale: 'en',
  strategy: 'no_prefix',
  compilation: {
    strictMessage: true,  // XSS protection
    escapeHtml: true      // Security enhancement
  }
}
```

### Usage in Components
```vue
<template>
  <h2>{{ t('sign_in_title') }}</h2>
  <input :placeholder="t('email_placeholder')" />
</template>

<script setup>
const { t } = useI18n()
</script>
```

## Performance Patterns

### Code Splitting
- **Automatic**: Components are automatically code-split
- **Lazy Loading**: Pages and heavy components use lazy loading
- **SSR/CSR Hybrid**: Optimized rendering strategy

### Loading Management
Global loading state is managed through `useLoadingUI`:

```typescript
const { showLoading, hideLoading } = useLoadingUI()

// Automatic loading in API calls
onRequest: () => {
  if (!import.meta.server) showLoading?.()
},
onResponse: () => {
  if (!import.meta.server) hideLoading?.()
}
```

## Development Guidelines

### Component Development
1. Use `<script setup>` with TypeScript
2. Define interfaces for all props and emits
3. Follow the component structure order
4. Include accessibility attributes
5. Use semantic HTML elements

### State Management
1. Use Pinia stores for global state
2. Expose state as readonly
3. Handle async operations in actions
4. Include proper error handling

### API Integration
1. Use custom API composables
2. Include inline TypeScript interfaces
3. Handle loading and error states
4. Follow security patterns (JWT + CSRF)

### Styling
1. Use CSS variables for consistency
2. Follow mobile-first responsive design
3. Scope all component styles
4. Include hover, focus, and disabled states

## Related Documents

- [API Communication Guide](./api-communication.md)
- [Authentication & Security Architecture](./auth-security-architecture.md)
- [Backend Patterns](./backend-patterns.md)
- [Development Setup](./development-setup.md)
- [Contributing Guidelines](./CONTRIBUTING.md)