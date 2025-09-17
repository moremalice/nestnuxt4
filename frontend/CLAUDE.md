# CLAUDE.md — Frontend (Nuxt 4)

## Tech Stack & Architecture
- **Nuxt 4.1.1** with `srcDir: "app"` and enhanced performance
- **Vue 3.5.21** with Composition API and latest optimizations
- **Pinia 3.0.3** for state management with readonly pattern
- **Key dirs:** `app/pages`, `app/components`, `app/composables`, `app/plugins`, `app/stores`, `app/middleware`, `app/layouts`, `app/types`
- **Internationalization:** 15 languages with `@nuxtjs/i18n v10` and lazy loading
- **Optional extensions:** `modules/`, `layers/`, `server/` for custom functionality

## API Communication & Auto-Loading
- **Modern Architecture:** `useNuxtApi()` series (useFetch-based) for all API calls
- **Server Proxy Layer:** NestJS API accessible via `/api/nestjs/*` routes
- **Automatic Loading:** All API calls managed by centralized plugin (`app/plugins/api.ts`)
- **No Manual Loading:** Loading states automatically shown/hidden globally
- **API Functions:** `useNuxtApi()`, `useNuxtGet()`, `useNuxtPost()` with reactive data/error handling
- **SSR Support:** Server-side requests with credential forwarding and timeout control
- **Error Handling:** Consistent `ApiResponse<T>` format with automatic normalization
- **Smart Retry:** Auto-retry on 401 (token refresh) and CSRF errors
- **Inline Types:** Component-specific type definitions for better independence and maintainability

## Auth & Security (Web)
- **Boot Process:** Single `/auth/refresh` attempt to obtain access token
- **Token Storage:** Access tokens in memory only, HttpOnly refresh cookies
- **Auth Store:** Centralized Pinia store for user state + CSRF management
- **Auto-Retry:** 401 → refresh token → retry once → logout on failure
- **CSRF Integration:** Auth Store manages CSRF tokens with 10-minute lifecycle
- **Multi-tab Sync:** BroadcastChannel for login/logout synchronization

## Auth (Mobile/WebView)
- **Native Apps:** Bearer token authentication (AT/RT), no CSRF required
- **WebView Context:** Cookie-based authentication rules apply (same as web)
- **Client Detection:** Automatic client type detection via headers
- **Secure Storage:** Refresh tokens in Keychain (iOS) / Keystore (Android)

## Performance & Optimization
- **Loading Strategy:** Automatic loading management prevents UI blocking
- **Route Optimization:** Lazy loading with code splitting
- **Component Loading:** Dynamic imports with `defineAsyncComponent`
- **Hydration Safety:** Browser-only APIs gated behind `process.client`/`onMounted`
- **Caching:** Smart API response caching with `useAsyncData`
- **Mobile Optimization:** AOS animations disabled on mobile for performance

## Styling Architecture
- **Custom CSS System:** CSS variables with `:root` definitions for theming
- **File Structure:** `font.css`, `default.css`, `common.css`, `content.css`
- **Responsive Design:** Mobile-first approach with breakpoint-based utilities
- **Component Naming:** `Component` suffix convention (e.g., `LoadingComponent.vue`)
- **Utility Classes:** Extensive utility system for spacing, colors, layouts
- **No Global Side Effects:** Scoped styling with CSS variable inheritance

## Developer Experience
- **TypeScript First:** Explicit return types, no `any`, strict type checking
- **Composable Design:** Small, focused composables with readonly pattern
- **Auto-imports:** Automatic composable imports via `imports.dirs` configuration
- **Component Auto-registration:** Path-based component registration
- **Development Tools:** Nuxt DevTools enabled in non-production environments
- **Hot Reload:** Seamless development experience with instant updates

## TypeScript & Vue Standards
- **Script Setup:** Always use `<script setup lang="ts">` for type safety and performance
- **Return Types:** Explicit return types for all functions and composables
- **Generic Types:** Use `ApiResponse<T>`, `Ref<T>` patterns consistently
- **Any Prohibition:** Avoid `any` type, use `unknown` or proper typing instead
- **Interface Priority:** Prefer `interface` over `type` for object shapes

## Component Development Rules
- **Naming Convention:** PascalCase with `Component` suffix (e.g., `LoginFormComponent.vue`)
- **Props Definition:** Use TypeScript interfaces for props, avoid PropType
- **Emits Definition:** Explicit emit definitions with TypeScript
- **Template Organization:** `<script setup>` → `<template>` → `<style scoped>` order
- **Reactive Data:** Use `ref()` for primitives, `reactive()` for objects
- **Computed Properties:** Always type computed return values

## Composables Standards
- **File Naming:** camelCase starting with `use` (e.g., `useAuth.ts`, `useApiHelper.ts`)
- **Folder Structure:** Organize by purpose: `api/`, `ui/`, `utils/`
- **Return Pattern:** Return readonly reactive data and methods
- **Single Responsibility:** One primary concern per composable
- **Type Exports:** Export interfaces/types used by the composable

## State Management (Pinia)
- **Store Naming:** `use[Feature]Store` pattern (e.g., `useAuthStore`, `useUserStore`)
- **Readonly Pattern:** Return readonly refs/computed from getters
- **Action Types:** Explicit return types for all actions
- **State Structure:** Flat state structure, avoid deep nesting
- **Persistence:** Use appropriate storage strategy (memory vs localStorage vs sessionStorage)

## File Organization (Nuxt 4)
- **Pages:** `/app/pages/` with file-based routing
- **Components:** `/app/components/` with auto-registration
- **Composables:** `/app/composables/` organized by category
- **Stores:** `/app/stores/` for Pinia stores
- **Types:** `/app/types/` for shared TypeScript definitions
- **Plugins:** `/app/plugins/` for Nuxt plugins
- **Middleware:** `/app/middleware/` for route middleware
- **Layouts:** `/app/layouts/` for page layouts

## API Integration Patterns
- **Standard Pattern:** Use `useNuxtApi()`, `useNuxtGet()`, `useNuxtPost()` for all API calls
- **Type Safety:** Component-specific inline type definitions for API responses
- **Server Routes:** Access NestJS via `/api/nestjs/*` proxy
- **Error Handling:** Handle `ApiResponse<T>` format with reactive data/error refs
- **Loading States:** Leverage automatic loading management via plugins
- **SSR Support:** Built-in with useFetch-based composables

## CSS & Styling Guidelines
- **CSS Variables:** Use `:root` definitions for theming
- **Scoped Styles:** Always use `<style scoped>` unless global styles needed
- **Utility Classes:** Leverage existing utility system before custom CSS
- **Mobile First:** Design with mobile-first responsive approach
- **No Global Side Effects:** Avoid global CSS that affects other components

## Environment & Configuration
- **Security-Enhanced Variables:** Private backend URLs (server-only) vs public proxy paths (client-safe)
- **Multi-Environment:** local/development/production with appropriate settings
- **CDN URL Management:** Unified CDN configuration separate from site URLs
- **Runtime Config:** Environment-specific API base URLs and feature flags
- **i18n Configuration:** 15 languages with security-focused compilation settings
- **SEO & Performance:** Sitemap generation, robots.txt, cache control headers
- **Development vs Production:** Different security, caching, and optimization settings

### Environment Variable Security Strategy
```typescript
// Private (server-only) - Real backend URLs hidden from client
NEST_BACKEND_BASE_URL: config.NUXT_BACKEND_BASE_URL

// Public (client-exposed) - Safe for client bundles
public: {
  NUXT_API_BASE_URL: '/api/nestjs',        // Proxy path only
  NUXT_APP_SITE_URL: config.public.url,   // SEO, meta tags
  NUXT_CDN_BASE_URL: config.cdn.url       // Static resources
}
```

## Prompt Recipes
- **Add New API Endpoint**: Use `useNuxtPost('endpoint', data)`, define types inline within component
- **GET Request Pattern**: `const { data, error } = await useNuxtGet<InlineType>('endpoint', params)`
- **POST Request Pattern**: `const { data, error } = await useNuxtPost<InlineType>('endpoint', body)`
- **Add Type Definitions**: Define interfaces directly in component `<script setup>` section
- **Auth Middleware**: Route protection using Auth Store, automatic token/CSRF handling
- **New Page Implementation**: `useAsyncData` pattern + automatic loading state management
- **Component Creation**: Include TypeScript interfaces + accessibility features
- **CSS Utilities**: Add following existing variable-based system
