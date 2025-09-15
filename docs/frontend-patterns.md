# Frontend Architecture Patterns

## API Plugin & Automatic Loading System

### API Plugin Configuration (`app/plugins/api.ts`)

The frontend uses a centralized API plugin that automatically handles loading states, authentication, and CSRF protection:

```typescript
// app/plugins/api.ts
export default defineNuxtPlugin((nuxtApp) => {
  const api = $fetch.create({
    baseURL: useRuntimeConfig().public.NUXT_API_BASE_URL,
    credentials: 'include',
    timeout: 30000,

    // Automatic loading management
    onRequest: async ({ options }) => {
      const { showLoading } = useLoadingUI()
      showLoading() // Auto-show loading on every request

      // Auto-inject JWT token
      const authStore = useAuthStore()
      const { token } = storeToRefs(authStore)
      if (token.value) {
        headers.set('Authorization', `Bearer ${token.value}`)
      }

      // Auto-inject CSRF token for mutations (Auth Store based)
      const method = (options.method || 'GET').toUpperCase()
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const authStore = useAuthStore()
        const csrfToken = await authStore.getCsrfToken()
        if (csrfToken) {
          headers.set('X-CSRF-Token', csrfToken)
        }
      }
    },

    onResponse: () => {
      const { hideLoading } = useLoadingUI()
      hideLoading() // Auto-hide loading on success
    },

    onResponseError: async ({ response, options, error }) => {
      const { hideLoading } = useLoadingUI()
      hideLoading() // Auto-hide loading on error

      // Auto-retry with token refresh on 401
      if (response?.status === 401) {
        const authStore = useAuthStore()
        const refreshSuccess = await authStore.refreshToken()

        if (refreshSuccess) {
          // Retry request with new token
          return await apiInstance(request, {
            ...options,
            context: { skipTokenRefresh: true }
          })
        }
      }
    }
  })

  return { provide: { api } }
})
```

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

```typescript
// app/composables/api/useNuxtApi.ts
// ApiResponse type is typically defined inline where needed

export const useNuxtApi = async <T = any>(
  endpoint: string,
  options: SimpleApiOptions = {}
) => {
  const { body, ...otherOptions } = options

  return await useFetch<ApiResponse<T>>(`/api/nestjs/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    body,
    ...otherOptions
  })
}

export const useNuxtGet = async <T = any>(
  endpoint: string,
  query?: Record<string, any>
) => {
  return await useFetch<ApiResponse<T>>(`/api/nestjs/${endpoint}`, {
    method: 'GET',
    query
  })
}

export const useNuxtPost = async <T = any>(
  endpoint: string,
  body?: Record<string, any>,
  options: SimpleApiOptions = {}
) => {
  return await useFetch<ApiResponse<T>>(`/api/nestjs/${endpoint}`, {
    method: 'POST',
    body,
    ...options
  })
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

### Auth Store Integration (`app/stores/auth.ts`)

```typescript
// stores/auth.ts
export const useAuthStore = defineStore('auth', () => {
  const csrfToken = ref<string | null>(null)
  const csrfExpiresAt = ref<number | null>(null)

  const getCsrfToken = async (): Promise<string | null> => {
    // Check if we have a valid token
    if (csrfToken.value && csrfExpiresAt.value && Date.now() < csrfExpiresAt.value) {
      return csrfToken.value
    }

    try {
      // Fetch new CSRF token
      const response = await $fetch<CsrfResponse>('/csrf/token', {
        credentials: 'include'
      })

      if (response.status === 'success') {
        csrfToken.value = response.data.token
        csrfExpiresAt.value = Date.now() + (10 * 60 * 1000) // 10 minutes
        return csrfToken.value
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    }

    return null
  }

  return {
    csrfToken: readonly(csrfToken),
    getCsrfToken
  }
})
```

### Automatic CSRF Usage
```typescript
// CSRF token automatically injected for POST requests
const { data, error } = await useNuxtPost('auth/logout', {}) // CSRF auto-injected via Auth Store
```

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
- API Communication Protocol: [`api-communication.md`](./api-communication.md)
- Auth & Security Architecture: [`auth-security-architecture.md`](./auth-security-architecture.md)
- Mobile Authentication: [`mobile-authentication.md`](./mobile-authentication.md)
- Development Environment: [`development-setup.md`](./development-setup.md)
