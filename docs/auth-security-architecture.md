# Authentication & Security Architecture

## Core Overview

This document provides a comprehensive guide to the authentication and security system for the NestJS + Nuxt.js application.

### 🔐 Core Architecture

**JWT Dual-Token System:**
- Access Token: Web(15min)/Mobile(30min) - Memory storage
- Refresh Token: Web(12hr)/Mobile(30d) - HttpOnly cookie

**CSRF Protection:**
- Web browsers: Double-submit cookie pattern
- Mobile apps: Automatic bypass with `X-Client-Type: mobile` header

**Automated Features:**
- Automatic JWT token refresh (30 seconds before expiry)
- Automatic CSRF token generation/refresh (10-minute cycle)
- Real-time cross-tab authentication state synchronization
- Automatic token injection for API requests

**Core File Structure:**
```
backend/src/module/
├── auth/                  # JWT token management
│   ├── auth.service.ts    # Token generation/validation
│   ├── auth.controller.ts # Authentication API endpoints
│   └── strategies/        # JWT validation strategies
└── security/              # CSRF and client detection
    ├── csrf.service.ts    # CSRF token management
    └── decorators/        # Client type detection

frontend/app/
├── stores/auth.ts         # Centralized authentication state management
├── composables/api/       # API call wrappers (automatic token injection)
├── plugins/auth.client.ts # App initialization authentication setup
└── middleware/auth.ts     # Page protection middleware
```

---

## Quick Implementation

### Environment Setup (.env)

```bash
# JWT Configuration (Required)
JWT_ACCESS_SECRET=your-32-char-secret-minimum  # Minimum 32 characters
JWT_REFRESH_SECRET=different-secret-from-above # Must be different from access
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=12h

# CSRF Configuration
CSRF_SECRET=your-csrf-secret-here
CSRF_STRICT=false  # Development: false, Production: true

# Production Required
NUXT_APP_SITE_URL=https://yourdomain.com
```

### Basic Login Implementation

```vue
<!-- pages/login.vue -->
<template>
  <form @submit.prevent="handleLogin">
    <input v-model="email" type="email" required />
    <input v-model="password" type="password" required />
    <button type="submit" :disabled="loading">Login</button>
  </form>
</template>

<script setup>
const email = ref('')
const password = ref('')
const loading = ref(false)

const handleLogin = async () => {
  loading.value = true
  try {
    const { data } = await useNuxtPost<AuthResponse>('auth/login', {
      email: email.value,
      password: password.value
    })
    // Automatically saves JWT, prepares CSRF token, syncs across tabs
    await navigateTo('/dashboard')
  } catch (error) {
    console.error('Login failed:', error)
  } finally {
    loading.value = false
  }
}
</script>
```

### Protected Page Setup

```vue
<!-- pages/dashboard.vue -->
<script setup>
// Single line to make authentication required
definePageMeta({ middleware: 'auth' })

// API call with automatic JWT injection
const { data: profile } = await useNuxtGet<UserProfile>('auth/profile')
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <p>Welcome, {{ profile?.email }}!</p>
  </div>
</template>
```

### Checklist

**Development Environment:**
- [ ] JWT secrets set to 32+ characters
- [ ] `CSRF_STRICT=false` configured
- [ ] Backend server running with CORS verified

**Production Environment:**
- [ ] `CSRF_STRICT=true` configured
- [ ] HTTPS enforcement enabled
- [ ] `NUXT_APP_SITE_URL` set to correct domain
- [ ] JWT secrets separated by environment

---

## API Reference

### Auth Store

```typescript
const auth = useAuthStore()

// Basic authentication operations
await auth.login({ email, password })
await auth.logout()

// State checking
auth.isAuthenticated     // boolean
auth.user               // User | null
auth.accessToken        // string | null

// Manual token management (usually handled automatically)
await auth.refreshToken()
await auth.fetchCsrfToken()
```

### API Calls (Automatic Token Injection)

For complete API communication patterns, see [API Communication Architecture](./api-communication.md).

```typescript
// GET request (automatic JWT header addition)
const { data, error } = await useNuxtGet<UserType>('auth/profile')

// POST request (automatic JWT + CSRF header addition)
const { data, error } = await useNuxtPost<ResultType>('api/create', {
  title: 'New Post',
  content: 'Post content'
})

// Advanced options - see API Communication guide for full details
const { data } = await useNuxtApi<ResponseType>({
  url: 'api/advanced',
  method: 'PUT',
  body: updateData
})
```

### Page and Component Protection

For complete frontend patterns, see [Frontend Patterns (Nuxt 4)](./frontend-patterns.md).

```typescript
// Page-level protection
definePageMeta({ middleware: 'auth' })

// Authentication state checking in components
const auth = useAuthStore()
if (!auth.isAuthenticated) {
  await navigateTo('/login')
}

// Conditional rendering
<template>
  <div v-if="auth.isAuthenticated">
    Content for authenticated users only
  </div>
</template>
```

### Mobile App Configuration

For complete mobile authentication setup, see [Mobile Authentication Guide](./mobile-authentication.md).

```typescript
// For React Native / Flutter usage
const apiClient = axios.create({
  baseURL: 'https://api.yourdomain.com',
  headers: {
    'X-Client-Type': 'mobile',  // Bypass CSRF
    'Content-Type': 'application/json'
  }
})

// JWT token interceptor - see Mobile Auth guide for full implementation
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

---

## Architecture Deep Dive

### Backend Core Components

**AuthService (auth.service.ts):**
- JWT token generation and validation
- Client-type-specific expiration settings (web/mobile)
- HttpOnly cookie management (for Refresh Tokens)

**CsrfService (security/csrf.service.ts):**
- Double-submit cookie pattern implementation
- CSRF bypass when `X-Client-Type: mobile` detected
- Fail-open mode (prevents service interruption on configuration errors)

For complete backend implementation patterns, see [Backend Patterns (NestJS)](./backend-patterns.md).

**ClientType Decorator:**
- Detection priority: Header(`X-Client-Type`) → User-Agent patterns → Web default
- Automatic recognition of React Native, Flutter, and other mobile frameworks

**JWT Guards:**
- Web: Refresh Token extraction from HttpOnly cookies
- Mobile: Access Token extraction from Bearer headers
- Single guard handles both approaches

### Frontend Core Flow

**Auth Store (stores/auth.ts):**
- Integrated management of JWT and CSRF tokens
- Automatic refresh with 30-second buffer before expiration
- Cross-tab synchronization via BroadcastChannel

**useNuxtApi Composables:**
- Automatic JWT Bearer header addition to all requests
- Automatic CSRF header addition to POST/PUT/DELETE requests
- Automatic token refresh and request retry on 401 responses

For detailed API communication implementation, see [API Communication Architecture](./api-communication.md).

**Auto Token Refresh:**
```typescript
// Automatic refresh 30 seconds before expiration
if (authStore.isTokenExpired(token, 30)) {
  await authStore.refreshToken()
}
```

**Cross-Tab Synchronization:**
```typescript
// Automatic synchronization across all tabs on login
sessionBus.postMessage({
  type: 'LOGIN',
  accessToken,
  user
})
```

### Security Design Principles

1. **Stateless JWT**: No server-side session storage, excellent scalability
2. **Dual Tokens**: JWT (authentication) + CSRF (request forgery prevention)
3. **Client-Specific Policies**: Web (enhanced security) vs Mobile (convenience)
4. **Automatic Token Management**: Seamless authentication maintenance without user intervention
5. **Fail-Safe Design**: Service continues even if security components fail

---

## Production & Troubleshooting

### Production Deployment Checklist

**Security Configuration:**
- [ ] JWT secrets 32+ characters, different values per environment
- [ ] `CSRF_STRICT=true` configured
- [ ] HTTPS enforcement enabled
- [ ] CORS domain restrictions configured
- [ ] Rate limiting activated

**Monitoring Metrics:**
- [ ] Token refresh failure rate < 0.5%
- [ ] API request 401 error rate < 1%
- [ ] CSRF validation failure rate < 0.1%
- [ ] Token refresh response time < 200ms

### Major Issue Resolution

| Issue | Cause | Solution |
|-------|-------|----------|
| **401 Infinite Loop** | JWT secret mismatch | Verify backend/frontend secrets match |
| **Logout on Refresh** | Normal behavior (security) | Display user guidance message |
| **CSRF Validation Failed** | CSRF applied to mobile | Add `X-Client-Type: mobile` header |
| **Cross-Tab Sync Failed** | BroadcastChannel unsupported | Recommend modern browser usage |

### Debugging Commands

```typescript
// Token state verification
const auth = useAuthStore()
console.log('JWT:', auth.accessToken)
console.log('Expired:', auth.isTokenExpired(auth.accessToken))
console.log('CSRF:', auth.csrfToken)

// Manual token refresh testing
const success = await auth.refreshToken()
console.log('Refresh Success:', success)
```

### Performance Optimization

**Token Management:**
- 30-second buffer eliminates user wait time
- Promise reuse prevents duplicate refreshes
- Exponential backoff reduces server load

**CSRF Tokens:**
- Page visibility-based refresh (excludes background tabs)
- 10-minute cycle balances security and performance

**Memory Management:**
- JWT memory storage (re-authentication on refresh)
- Automatic BroadcastChannel cleanup prevents memory leaks

---

## Related Documents

- [Mobile Authentication Guide](./mobile-authentication.md) - Mobile app-specific authentication setup
- [API Communication Architecture](./api-communication.md) - API communication patterns and proxy implementation
- [Frontend Patterns (Nuxt 4)](./frontend-patterns.md) - Nuxt 4 development patterns and composables
- [Backend Patterns (NestJS)](./backend-patterns.md) - NestJS development patterns and best practices
- [Development Setup](./development-setup.md) - Environment configuration and setup guide