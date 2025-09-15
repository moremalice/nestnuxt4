# Nuxt 4 API Migration Guide

## Overview

This document explains the migration from the legacy `useApi.ts` pattern to the modern `useNuxtApi.ts` architecture in Nuxt 4, highlighting the benefits of the proxy-based approach and useFetch integration.

## Architecture Comparison

### Legacy Approach (useApi.ts)
```
Browser → Direct NestJS Connection (localhost:3020)
- Custom $fetch instance via plugins/api.ts
- Manual token/CSRF/loading management
- Direct backend URL exposure
```

### Modern Approach (useNuxtApi.ts)
```
Browser → Nuxt Server (/api/nestjs/*) → NestJS (localhost:3020)
- useFetch-based with automatic state management
- Proxy layer for security and SSR compatibility
- Unified domain architecture
```

## Key Differences

### 1. Request Flow

**Legacy (`useApi.ts`)**:
```typescript
// Direct backend connection
const response = await useApi<LoginResponse>('/auth/login', loginData)
// Manual status checking required
if (response.status === 'success') {
  // Handle success
}
```

**Modern (`useNuxtApi.ts`)**:
```typescript
// Proxy-based with reactive data
const { data, error, pending } = await useNuxtPost<LoginResponse>('auth/login', loginData)
// Automatic reactive updates
if (data.value?.status === 'success') {
  // Handle success
}
```

### 2. Configuration

**Legacy Configuration (plugins/api.ts)**:
```typescript
const api = $fetch.create({
  baseURL: useRuntimeConfig().public.NUXT_API_BASE_URL, // Direct URL
  credentials: 'include',
  timeout: 30000
})
```

**Modern Configuration (nuxt.config.ts)**:
```typescript
routeRules: {
  '/api/nestjs/**': {
    cors: true,
    headers: { 'access-control-allow-credentials': 'true' }
  }
}
```

## Proxy Benefits

### 1. Security Enhancements
- **CORS Resolution**: Eliminates browser same-origin policy issues
- **URL Hiding**: Backend URLs not exposed to client
- **Credential Safety**: HttpOnly cookies properly forwarded
- **Attack Surface Reduction**: Internal network communication

### 2. SSR/SSG Compatibility
```typescript
const result = await useFetch<ApiResponse<T>>(`/api/nestjs/${endpoint}`, {
  server: true, // Runs on server during SSR
  // ... other options
})
```
- **Server-Side Rendering**: API calls work during SSR
- **Hydration Stability**: Client-server state consistency
- **SEO Optimization**: Initial page load includes data

### 3. Development/Production Consistency
- **Single Domain**: Production serves API and frontend from one domain
- **Environment Parity**: Development mirrors production proxy setup
- **Infrastructure Simplification**: No separate CORS configuration needed

## Nuxt 4 useFetch Advantages

### 1. Automatic State Management
```typescript
// Automatic reactive data, error, and pending states
const { data, error, pending, refresh } = await useNuxtGet<UserData>('users/profile')

// Reactive UI updates
watchEffect(() => {
  if (pending.value) {
    // Show loading state
  } else if (error.value) {
    // Handle error
  } else if (data.value) {
    // Display data
  }
})
```

### 2. Smart Caching & Deduplication
- **Request Deduplication**: Identical simultaneous requests merged
- **Automatic Caching**: Intelligent response caching
- **Request Cancellation**: Auto-cancel on component unmount

### 3. Enhanced Developer Experience
- **DevTools Integration**: Request monitoring in Nuxt DevTools
- **Hot Reload**: Instant updates during development
- **Type Safety**: Full TypeScript integration
- **Error Handling**: Comprehensive error state management

### 4. Performance Optimizations
```typescript
// Built-in optimizations
const { data } = await useNuxtApi<ProductList>('products', {
  server: true,        // SSR for SEO
  lazy: true,          // Non-blocking hydration
  default: () => []    // Default value to prevent layout shift
})
```

## Migration Benefits

### 1. Future-Proof Architecture
- **Nuxt 4 Standards**: Follows official best practices
- **Scalability**: Consistent patterns for feature additions
- **Maintainability**: Standardized approach across codebase

### 2. Production Optimization
- **Single Domain Deployment**: Simplified infrastructure
- **Internal Communication**: Secure backend-to-backend calls
- **Load Balancing**: Better support for horizontal scaling

### 3. Team Development Efficiency
- **Standardization**: Consistent patterns for all developers
- **Documentation Alignment**: Matches official Nuxt documentation
- **Onboarding**: Reduced learning curve for new developers

## Usage Patterns

### GET Requests
```typescript
// Simple GET with query parameters
const { data, error } = await useNuxtGet<UserList>('users', {
  page: 1,
  limit: 10
})

// Advanced GET with options
const { data, pending, refresh } = await useNuxtGet<UserProfile>('users/profile', {}, {
  server: false,  // Client-side only
  context: { skipTokenRefresh: true }
})
```

### POST Requests
```typescript
// Create new resource
const { data, error } = await useNuxtPost<CreateUserResponse>('users', {
  name: 'John Doe',
  email: 'john@example.com'
})

// Login with automatic token handling
const { data } = await useNuxtPost<LoginResponse>('auth/login', {
  email: user.email,
  password: user.password
})
```

### Error Handling
```typescript
const { data, error } = await useNuxtPost<ApiResponse>('endpoint', payload)

if (error.value) {
  const errorData = error.value.data?.data
  if (errorData?.name === 'ValidationError') {
    // Handle validation errors
  } else if (errorData?.name === 'AuthenticationError') {
    // Handle auth errors
  }
}
```

## Best Practices

### 1. Type Definitions
```typescript
// Define types inline within components for independence
interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  user: UserInfo
}

// Use the types with API calls
const { data } = await useNuxtPost<LoginResponse>('auth/login', loginData)
```

### 2. Error Handling
```typescript
// Always handle both data and error states
const { data, error, pending } = await useNuxtGet<UserData>('users/me')

if (error.value) {
  // Handle error appropriately
  console.error('Failed to load user:', error.value)
  return
}

// Safe to use data.value here
```

### 3. Loading States
```typescript
// Leverage automatic loading management
const { pending } = await useNuxtPost<any>('heavy-operation', payload)

// UI automatically shows loading via global plugin
// No manual loading state management needed
```

## Conclusion

The migration to `useNuxtApi.ts` with proxy-based architecture represents a significant advancement in:

- **Security**: Enhanced protection through proxy layer
- **Performance**: Automatic optimizations and caching
- **Developer Experience**: Simplified API patterns and automatic state management
- **Production Readiness**: Enterprise-grade architecture patterns

This approach aligns with modern full-stack development practices while maintaining backward compatibility with existing NestJS backend architecture.