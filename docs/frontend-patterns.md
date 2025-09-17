# Frontend Architecture Patterns

## API Plugin & Automatic Loading System

### Security Pattern: Server Handler vs Client Plugin

For complete security architecture details, see [Authentication & Security Architecture](./auth-security-architecture.md).

**Server Handler (Private Backend Access):**
```typescript
// server/api/nestjs/[...path].ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  // Private backend URL - only accessible on server-side
  const nestApiUrl = config.NEST_BACKEND_BASE_URL

  const response = await $fetch.raw(`${nestApiUrl}/${path}`, {
    method, query, body, headers: forwardHeaders
  })

  return response._data
})
```

**Client Plugin (Public Proxy Access):**
```typescript
// app/plugins/api.ts - Client uses proxy path only
const api = $fetch.create({
  baseURL: '/api/nestjs', // Public proxy path, hides real backend
  credentials: 'include'
})
```

**Security Benefits:**
- ✅ **Two-Layer Protection**: Client → Proxy → Backend (real URLs hidden)
- ✅ **Server-Side Resolution**: Backend URLs resolved only on server
- ✅ **Environment Isolation**: Different backends per environment
- ✅ **Bundle Security**: No sensitive URLs in client JavaScript

### API Plugin Configuration (`app/plugins/api.ts`)

The frontend uses a centralized API plugin that automatically handles loading states, authentication, and CSRF protection. For complete API communication patterns, see [API Communication Architecture](./api-communication.md).

**Key Features:**
- **Auto Loading Management**: Global loading UI control
- **JWT Token Injection**: Automatic Bearer token attachment
- **CSRF Protection**: Auto CSRF token for mutations
- **401 Auto-Retry**: Transparent token refresh and request retry
- **Proxy Security**: All requests go through `/api/nestjs/*` proxy

### Automatic Loading UI System

**Global Loading State (`app/composables/ui/useLoadingUI.ts`):**
```typescript
const isLoading = ref(false)

export const useLoadingUI = () => {
  const showLoading = () => { isLoading.value = true }
  const hideLoading = () => { isLoading.value = false }

  return {
    isLoading: readonly(isLoading),
    showLoading,
    hideLoading
  }
}
```

**Loading Component (`app/components/common/LoadingComponent.vue`):**
```vue
<template>
  <Teleport to="body">
    <Transition name="loading">
      <div v-if="isLoading" class="app-loading-overlay">
        <div class="app-loading-spinner">
          <div class="spinner-icon"></div>
          <div class="spinner-text">Loading...</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { isLoading } = useLoadingUI()
</script>

<style scoped>
.app-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.loading-enter-active, .loading-leave-active {
  transition: opacity 0.3s ease;
}

.loading-enter-from, .loading-leave-to {
  opacity: 0;
}
</style>
```

## Modern API Composables

### API Composable (`app/composables/api/useNuxtApi.ts`)

Updated implementation with advanced loading management and authentication:

```typescript
// app/composables/api/useNuxtApi.ts - Current implementation
interface SimpleApiOptions {
  body?: any
  query?: any
  context?: ApiContextFlags
  server?: boolean
}

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

  const config = useRuntimeConfig()
  const apiBasePath = config.public.NUXT_API_BASE_URL

  const { showLoading, hideLoading } = useLoadingUI()
  const authStore = useAuthStore()
  const { token } = storeToRefs(authStore)

  const result = await useFetch<ApiResponse<T>>(`${apiBasePath}/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    body,
    query,
    server,

    onRequest: async ({ options }) => {
      if (!import.meta.server) showLoading?.()

      const headers = new Headers()

      // JWT token injection
      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      // CSRF token injection (POST requests only)
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

      // Auto token refresh on 401
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

export const useNuxtGet = <T = any>(
  endpoint: string,
  query?: any,
  options: Omit<SimpleApiOptions, 'body' | 'query'> = {}
) => {
  return useNuxtApi<T>(endpoint, { ...options, query })
}

export const useNuxtPost = <T = any>(
  endpoint: string,
  body?: any,
  options: Omit<SimpleApiOptions, 'body'> = {}
) => {
  return useNuxtApi<T>(endpoint, { ...options, body })
}
```

### Usage Patterns

**Standard API Call Pattern:**
```typescript
// GET request
const { data, error, pending } = await useNuxtGet<PostsResponse>('posts')

if (!error.value && data.value?.status === 'success') {
  posts.value = data.value.data
}
```

**Form Submission Pattern:**
```typescript
// POST request with form data
const { data, error } = await useNuxtPost<CreateResponse>('posts', formData)

if (!error.value && data.value?.status === 'success') {
  await navigateTo(`/posts/${data.value.data.id}`)
} else {
  showError(error.value || data.value?.message)
}
```

## CSRF Protection Integration

For comprehensive authentication patterns, see [Authentication & Security Architecture](./auth-security-architecture.md).

**Key CSRF Features:**
- **Automatic Injection**: CSRF tokens automatically added to POST/PUT/DELETE requests
- **Token Caching**: Smart caching with 10-minute expiration
- **Retry Logic**: Exponential backoff on token fetch failures
- **Auth Store Integration**: Unified with JWT token management

## Component Integration Patterns

### Data Fetching in Components

**Page Component (`pages/posts/index.vue`):**
```vue
<template>
  <div>
    <h1>Posts</h1>
    <div v-if="pending">Loading posts...</div>
    <div v-else-if="error">Error loading posts</div>
    <div v-else>
      <PostItem
        v-for="post in posts"
        :key="post.id"
        :post="post"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Post {
  id: number
  title: string
  content: string
}

const { data, error, pending } = await useNuxtGet<Post[]>('posts')
const posts = computed(() => data.value?.status === 'success' ? data.value.data : [])
</script>
```

### Reactive Form Handling

**Form Component (`components/forms/LoginFormComponent.vue`):**
```vue
<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="email">Email:</label>
      <input
        id="email"
        v-model="form.email"
        type="email"
        required
        :disabled="isSubmitting"
      >
    </div>

    <div class="form-group">
      <label for="password">Password:</label>
      <input
        id="password"
        v-model="form.password"
        type="password"
        required
        :disabled="isSubmitting"
      >
    </div>

    <button type="submit" :disabled="isSubmitting">
      {{ isSubmitting ? 'Logging in...' : 'Login' }}
    </button>

    <div v-if="errorMessage" class="error">
      {{ errorMessage }}
    </div>
  </form>
</template>

<script setup lang="ts">
interface LoginForm {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  user: { id: number; email: string }
}

const form = reactive<LoginForm>({
  email: '',
  password: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')

const emit = defineEmits<{
  success: [user: LoginResponse['user']]
}>()

const handleSubmit = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await useNuxtPost<LoginResponse>('auth/login', form)

    if (!error.value && data.value?.status === 'success') {
      emit('success', data.value.data.user)
    } else {
      errorMessage.value = error.value?.message || data.value?.message || 'Login failed'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>
```

## Advanced Auth Store Patterns

### Concurrency Control & Token Management

The Auth Store implements sophisticated concurrency control to prevent duplicate requests and manage token lifecycle:

```typescript
// stores/auth.ts - Advanced token management with concurrency control
export const useAuthStore = defineStore('auth', () => {
  // Token refresh concurrency control
  let refreshTokenPromise: Promise<boolean> | null = null
  let refreshRetryCount = 0
  const MAX_REFRESH_RETRIES = 2
  let lastRefreshFailTime = 0
  const REFRESH_COOLDOWN = 30000

  // JWT token expiration checking with buffer
  const isTokenExpired = (token: string | null, bufferSeconds: number = 30): boolean => {
    if (!token) return true

    try {
      const parts = token.split('.')
      if (parts.length !== 3) return true

      const payload = JSON.parse(atob(parts[1] || ''))
      if (!payload.exp || typeof payload.exp !== 'number') return true

      // Apply buffer (default 30 seconds before expiry)
      const expirationTime = payload.exp * 1000 - (bufferSeconds * 1000)
      return Date.now() >= expirationTime
    } catch (error) {
      return true
    }
  }

  // Concurrent token refresh prevention
  const refreshToken = async (silent: boolean = false): Promise<boolean> => {
    // Return existing promise if refresh is already in progress
    if (refreshTokenPromise) {
      return await refreshTokenPromise
    }

    // Create new refresh promise
    refreshTokenPromise = performRefresh(silent)

    try {
      return await refreshTokenPromise
    } finally {
      refreshTokenPromise = null
    }
  }

  // Exponential backoff calculation
  const getBackoffDelay = (attempt: number, base = 500, cap = 5000): number => {
    const exponential = Math.min(cap, base * Math.pow(2, attempt))
    const jitter = Math.random() * 200 // Random jitter for load distribution
    return exponential + jitter
  }

  // Actual refresh implementation with retry logic
  const performRefresh = async (silent: boolean = false): Promise<boolean> => {
    const now = Date.now()

    // Cooldown period check
    if (now - lastRefreshFailTime < REFRESH_COOLDOWN) {
      return false
    }

    // Max retry check
    if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
      clearAuth()
      refreshRetryCount = 0
      lastRefreshFailTime = now
      return false
    }

    try {
      const { data, error } = await useNuxtPost<RefreshResponse>('auth/refresh', {}, {
        context: { skipTokenRefresh: true } // Prevent infinite loop
      })

      if (!error.value && data.value?.status === 'success') {
        accessToken.value = data.value.data.accessToken
        user.value = data.value.data.user
        refreshRetryCount = 0 // Reset retry counter
        return true
      }

      refreshRetryCount++
      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        clearAuth()
        lastRefreshFailTime = now
      }

      return false
    } catch (error) {
      if (!silent) {
        console.warn('Token refresh failed:', error)
      }

      refreshRetryCount++
      if (refreshRetryCount >= MAX_REFRESH_RETRIES) {
        clearAuth()
        lastRefreshFailTime = now
      }

      return false
    }
  }
})
```

### Integrated CSRF Management

The Auth Store includes sophisticated CSRF token management with automatic refresh and error handling:

```typescript
// CSRF token management with concurrency control
const MAX_CSRF_RETRIES = 3
let csrfRefreshTimer: ReturnType<typeof setTimeout> | null = null
let csrfFetchPromise: Promise<string | null> | null = null

const fetchCsrfToken = async (currentRetry: number = 0): Promise<string | null> => {
  if (currentRetry >= MAX_CSRF_RETRIES) {
    return null
  }

  // Prevent concurrent CSRF requests
  if (isCsrfLoading.value && currentRetry === 0) {
    await waitForCsrfTokenLoading()
    return csrfToken.value
  }

  if (csrfFetchPromise && currentRetry === 0) {
    return await csrfFetchPromise
  }

  const fetchPromise = performCsrfFetch(currentRetry)
  if (currentRetry === 0) {
    csrfFetchPromise = fetchPromise
  }

  try {
    return await fetchPromise
  } finally {
    if (currentRetry === 0) {
      csrfFetchPromise = null
    }
  }
}

const performCsrfFetch = async (currentRetry: number): Promise<string | null> => {
  isCsrfLoading.value = true

  try {
    const config = useRuntimeConfig()
    const response = await $fetch<CsrfApiResponse>(`${config.public.NUXT_API_BASE_URL}/csrf/token`, {
      method: 'GET',
      timeout: 10000,
      credentials: 'include'
    })

    if (response.status === 'success' && response.data?.csrfToken) {
      csrfToken.value = response.data.csrfToken

      // Auto-refresh after 10 minutes
      clearCsrfRefreshTimer()
      csrfRefreshTimer = setTimeout(() => {
        clearCsrfToken()
        fetchCsrfToken()
      }, 10 * 60 * 1000)

      return response.data.csrfToken
    } else {
      throw new Error('Invalid CSRF response')
    }
  } catch (error: any) {
    if (currentRetry < MAX_CSRF_RETRIES) {
      const delay = Math.pow(2, currentRetry) * 1000 // Exponential backoff

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(fetchCsrfToken(currentRetry + 1))
        }, delay)
      })
    }

    return null
  } finally {
    if (currentRetry === 0) {
      isCsrfLoading.value = false
    }
  }
}
```

## Cross-Tab Synchronization Patterns

### BroadcastChannel Session Bus

The application implements real-time authentication state synchronization across browser tabs using BroadcastChannel:

```typescript
// plugins/session-bus.client.ts - Cross-tab authentication synchronization
interface AuthBusMessage {
  type: 'LOGIN' | 'ACCESS_TOKEN' | 'LOGOUT'
  from: string
  accessToken?: string
  user?: {
    idx: number
    email: string
    isActive: boolean
  }
}

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // Create BroadcastChannel for cross-tab communication
  const channel = new BroadcastChannel('auth-bus')

  // Unique tab identifier to prevent message loops
  const tabId = (crypto?.getRandomValues(new Uint32Array(1))[0] ??
                Math.floor(Math.random() * 0xffffffff)).toString(16)

  const auth = useAuthStore()

  // Message broadcast helper
  const broadcast = (msg: Omit<AuthBusMessage, 'from'>) => {
    const message: AuthBusMessage = { ...msg, from: tabId }
    channel.postMessage(message)
  }

  // Outbound: Broadcast when store actions complete
  auth.$onAction(({ name, after }) => {
    // Login success
    if (name === 'login') {
      after((success: boolean) => {
        if (success && auth.accessToken) {
          broadcast({
            type: 'LOGIN',
            accessToken: auth.accessToken as string,
            user: auth.currentUser as any
          })
        }
      })
    }

    // Token refresh success
    if (name === 'refreshToken') {
      after((success: boolean) => {
        if (success && auth.accessToken) {
          broadcast({
            type: 'ACCESS_TOKEN',
            accessToken: auth.accessToken as string
          })
        }
      })
    }

    // Logout success
    if (name === 'logout') {
      after((success: boolean) => {
        if (success) {
          broadcast({ type: 'LOGOUT' })
        }
      })
    }
  })

  // Inbound: Handle messages from other tabs
  channel.onmessage = async (event: MessageEvent<AuthBusMessage>) => {
    const msg = event.data

    // Ignore own messages
    if (!msg || msg.from === tabId) return

    switch (msg.type) {
      case 'LOGIN': {
        // Sync access token from other tab login
        if (msg.accessToken && auth.accessToken !== msg.accessToken) {
          // @ts-ignore - Pinia $patch bypasses readonly
          auth.$patch({
            accessToken: msg.accessToken,
            user: msg.user || null
          })

          // Load profile if user info missing
          if (!auth.currentUser && msg.accessToken) {
            await auth.getProfile()
          }
        }
        break
      }

      case 'ACCESS_TOKEN': {
        // Sync access token refresh from other tab
        if (msg.accessToken && auth.accessToken !== msg.accessToken) {
          // @ts-ignore - Pinia $patch bypasses readonly
          auth.$patch({ accessToken: msg.accessToken })
        }
        break
      }

      case 'LOGOUT': {
        // Logout this tab when other tab logs out
        await auth.clearAuth()

        // Also clear CSRF token
        const { clearCsrfToken } = useCsrf()
        clearCsrfToken()
        break
      }
    }
  }

  // Cleanup on tab close
  window.addEventListener('beforeunload', () => {
    channel.close()
  })
})
```

### Cross-Tab State Synchronization Benefits

- **Real-time Sync**: Login/logout in one tab immediately reflects in all tabs
- **Token Updates**: Token refresh in one tab updates all tabs
- **Memory Efficiency**: Prevents duplicate token refresh requests across tabs
- **User Experience**: Seamless authentication state across browser tabs
- **Security**: Logout in one tab secures all tabs

## Advanced reCAPTCHA Integration

### Dynamic Script Loading & Token Management

The reCAPTCHA system features dynamic script loading, token caching, and automatic validation:

```typescript
// composables/utils/useRecaptcha.ts - Advanced reCAPTCHA integration
let recaptchaInstance: RecaptchaInstance | null = null
let isScriptLoaded = false
let isLoading = false
let loadingPromise: Promise<boolean> | null = null

export const useRecaptcha = () => {
  const isRecaptchaReady = ref(false)
  const isExecuting = ref(false)
  const lastError = ref<string | null>(null)

  // Dynamic script loading with error handling
  const loadRecaptchaScript = async (): Promise<boolean> => {
    if (isScriptLoaded) return true
    if (isLoading && loadingPromise) return loadingPromise

    isLoading = true
    loadingPromise = new Promise((resolve) => {
      try {
        // Check if script already exists
        const existingScript = document.querySelector('script[src*="recaptcha"]')
        if (existingScript) {
          isScriptLoaded = true
          isLoading = false
          resolve(true)
          return
        }

        const config = useRuntimeConfig()
        const siteKey = config.public.NUXT_RECAPTCHA_SITE_KEY
        const scriptUrl = `https://www.google.com/recaptcha/api.js?render=${siteKey}&hl=ko`

        const script = document.createElement('script')
        script.src = scriptUrl
        script.async = true
        script.defer = true

        let timeoutId: NodeJS.Timeout

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId)
          isLoading = false
        }

        script.onload = () => {
          cleanup()
          isScriptLoaded = true
          resolve(true)
        }

        script.onerror = (error) => {
          cleanup()
          isScriptLoaded = false
          console.error('Failed to load reCAPTCHA script:', error)
          resolve(false)
        }

        // 10-second timeout
        timeoutId = setTimeout(() => {
          cleanup()
          isScriptLoaded = false
          console.error('reCAPTCHA script loading timeout')
          resolve(false)
        }, 10000)

        document.head.appendChild(script)
      } catch (error) {
        isScriptLoaded = false
        isLoading = false
        console.error('Exception while loading reCAPTCHA script:', error)
        resolve(false)
      }
    })

    return loadingPromise
  }

  // Token management with caching and expiry
  const currentToken = ref<string | null>(null)
  const tokenGeneratedAt = ref<number | null>(null)
  const TOKEN_EXPIRY_MS = 110000 // 110 seconds (2 minutes - 10 seconds buffer)

  // Check if current token is still valid
  const isTokenValid = (): boolean => {
    if (!currentToken.value || !tokenGeneratedAt.value) {
      return false
    }

    const elapsed = Date.now() - tokenGeneratedAt.value
    return elapsed < TOKEN_EXPIRY_MS
  }

  // Get valid token (refresh if needed)
  const getValidToken = async (action: string = 'submit'): Promise<RecaptchaResult> => {
    // Return existing valid token
    if (isTokenValid()) {
      return {
        success: true,
        token: currentToken.value!
      }
    }

    // Generate new token
    const result = await executeRecaptcha(action)

    if (result.success && result.token) {
      currentToken.value = result.token
      tokenGeneratedAt.value = Date.now()
    }

    return result
  }

  // Execute reCAPTCHA with comprehensive error handling
  const executeRecaptcha = async (action: string = 'submit'): Promise<RecaptchaResult> => {
    if (isExecuting.value) {
      return {
        success: false,
        error: 'reCAPTCHA is already executing'
      }
    }

    try {
      isExecuting.value = true
      lastError.value = null

      // Initialize if not ready
      const ready = await isRecaptchaLoaded()
      if (!ready || !recaptchaInstance) {
        return {
          success: false,
          error: 'reCAPTCHA not ready or failed to initialize'
        }
      }

      const config = useRuntimeConfig()
      const siteKey = config.public.NUXT_RECAPTCHA_SITE_KEY
      const token = await recaptchaInstance.execute(siteKey, { action })

      if (!token || typeof token !== 'string' || token.trim() === '') {
        return {
          success: false,
          error: 'Token generation failed - invalid token received'
        }
      }

      return {
        success: true,
        token
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'reCAPTCHA execution error'
      lastError.value = errorMessage
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      isExecuting.value = false
    }
  }

  // Token expiry countdown in seconds
  const tokenExpiresIn = computed(() => {
    if (!tokenGeneratedAt.value || !currentToken.value) return 0
    const elapsed = Date.now() - tokenGeneratedAt.value
    const remaining = TOKEN_EXPIRY_MS - elapsed
    return Math.max(0, Math.floor(remaining / 1000))
  })

  return {
    isRecaptchaReady: readonly(isRecaptchaReady),
    isExecuting: readonly(isExecuting),
    lastError: readonly(lastError),
    executeRecaptcha,
    getValidToken,
    isTokenValid,
    currentToken: readonly(currentToken),
    tokenExpiresIn: readonly(tokenExpiresIn)
  }
}
```

### reCAPTCHA Component Integration

```vue
<!-- components/common/RecaptchaCheckboxComponent.vue -->
<template>
  <div class="recaptcha-container">
    <div v-if="isLoading" class="recaptcha-loading">
      Loading reCAPTCHA...
    </div>
    <div v-else-if="error" class="recaptcha-error">
      reCAPTCHA failed to load: {{ error }}
    </div>
    <div v-else class="recaptcha-ready">
      <button
        @click="generateToken"
        :disabled="isExecuting"
        class="recaptcha-button"
      >
        {{ isExecuting ? 'Generating...' : 'Verify reCAPTCHA' }}
      </button>
      <div v-if="tokenExpiresIn > 0" class="token-status">
        Token expires in {{ tokenExpiresIn }}s
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  action?: string
  autoGenerate?: boolean
}

interface Emits {
  (e: 'token-generated', token: string): void
  (e: 'token-error', error: string): void
}

const props = withDefaults(defineProps<Props>(), {
  action: 'submit',
  autoGenerate: false
})

const emit = defineEmits<Emits>()

const {
  isRecaptchaReady,
  isExecuting,
  lastError,
  getValidToken,
  tokenExpiresIn
} = useRecaptcha()

const isLoading = computed(() => !isRecaptchaReady.value && !lastError.value)
const error = computed(() => lastError.value)

const generateToken = async () => {
  const result = await getValidToken(props.action)

  if (result.success && result.token) {
    emit('token-generated', result.token)
  } else {
    emit('token-error', result.error || 'Failed to generate token')
  }
}

// Auto-generate token if requested
if (props.autoGenerate) {
  watch(isRecaptchaReady, (ready) => {
    if (ready) {
      generateToken()
    }
  })
}
</script>
```

## Store Integration Patterns

### Feature Store (`stores/posts.ts`)

```typescript
// stores/posts.ts
export const usePostsStore = defineStore('posts', () => {
  const posts = ref<Post[]>([])
  const currentPost = ref<Post | null>(null)
  const isLoading = ref(false)

  const fetchPosts = async (): Promise<void> => {
    isLoading.value = true
    try {
      const { data, error } = await useNuxtGet<Post[]>('posts')

      if (!error.value && data.value?.status === 'success') {
        posts.value = data.value.data
      } else {
        throw new Error(error.value?.message || data.value?.message || 'Failed to fetch posts')
      }
    } finally {
      isLoading.value = false
    }
  }

  const createPost = async (postData: CreatePostData): Promise<Post> => {
    const { data, error } = await useNuxtPost<Post>('posts', postData)

    if (!error.value && data.value?.status === 'success') {
      const newPost = data.value.data
      posts.value.unshift(newPost)
      return newPost
    } else {
      throw new Error(error.value?.message || data.value?.message || 'Failed to create post')
    }
  }

  return {
    posts: readonly(posts),
    currentPost: readonly(currentPost),
    isLoading: readonly(isLoading),
    fetchPosts,
    createPost
  }
})
```

## Advanced Patterns

### Composable with API Integration

**Feature Composable (`composables/features/usePosts.ts`):**
```typescript
// composables/features/usePosts.ts
export const usePosts = () => {
  const posts = ref<Post[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const loadPosts = async () => {
    isLoading.value = true
    error.value = null

    try {
      const { data, error: apiError } = await useNuxtGet<Post[]>('posts')

      if (!apiError.value && data.value?.status === 'success') {
        posts.value = data.value.data
      } else {
        throw new Error(apiError.value?.message || data.value?.message || 'Failed to load posts')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading posts:', err)
    } finally {
      isLoading.value = false
    }
  }

  const deletePost = async (postId: number) => {
    const { data, error: apiError } = await useNuxtPost('posts/delete', { id: postId })

    if (!apiError.value && data.value?.status === 'success') {
      posts.value = posts.value.filter(post => post.id !== postId)
      return true
    } else {
      throw new Error(apiError.value?.message || data.value?.message || 'Failed to delete post')
    }
  }

  return {
    posts: readonly(posts),
    isLoading: readonly(isLoading),
    error: readonly(error),
    loadPosts,
    deletePost
  }
}
```

### Error Boundary Pattern

```typescript
// composables/utils/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleApiError = (error: any, fallbackMessage = 'An error occurred') => {
    console.error('API Error:', error)

    let message = fallbackMessage

    if (error?.data?.message) {
      message = error.data.message
    } else if (error?.message) {
      message = error.message
    }

    // Show user-friendly error
    const { $toast } = useNuxtApp()
    $toast.error(message)

    return message
  }

  return {
    handleApiError
  }
}
```

This architecture provides a comprehensive, modern API communication system with automatic loading states, authentication, CSRF protection, and robust error handling patterns.

## Related Documents

- [Authentication & Security Architecture](./auth-security-architecture.md) - Complete JWT/CSRF authentication system
- [API Communication Architecture](./api-communication.md) - API communication patterns and proxy implementation
- [Backend Patterns (NestJS)](./backend-patterns.md) - NestJS development patterns and best practices
- [Mobile Authentication Guide](./mobile-authentication.md) - Mobile app-specific authentication setup
- [Development Setup](./development-setup.md) - Environment configuration and setup guide
