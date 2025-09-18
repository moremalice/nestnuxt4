# CLAUDE.md — Frontend (Nuxt 4)

## Tech Stack
- **Core**: Nuxt 4.1.1 + Vue 3.5.21 + Pinia 3.0.3
- **Dirs**: `app/pages`, `app/components`, `app/composables`, `app/stores`
- **API**: `useApi`/`useGet`/`usePost` → `/api/nestjs/*` proxy
- **Features**: 15 languages i18n, auto-loading, SSR/CSR hybrid

## Key Patterns
- **Auth**: Memory tokens (web), Bearer (mobile), Auth Store + CSRF
- **API**: Inline types in components, auto-loading via plugin
- **Components**: `<script setup>`, PascalCase + Component suffix
- **Styling**: CSS variables, scoped styles, mobile-first
- **Performance**: Lazy loading, code splitting, SSR credential forwarding

## Development Rules
- **Components**: `<script setup>` → `<template>` → `<style scoped>`
- **Props/Emits**: TypeScript interfaces, explicit definitions
- **Composables**: camelCase with `use` prefix, organize by purpose
- **Stores**: `use[Feature]Store`, readonly pattern, flat state
- **Styling**: CSS variables, scoped styles, utility classes

## Environment Security
```typescript
// Private (server-only) - Hidden from client bundles
NEST_BACKEND_BASE_URL: config.NUXT_BACKEND_BASE_URL

// Public (client-exposed) - Safe for bundles
public: {
  NUXT_API_BASE_URL: '/api/nestjs',        // Proxy only
  NUXT_APP_SITE_URL: config.public.url,   // SEO
  NUXT_CDN_BASE_URL: config.cdn.url       // Static resources
}
```

## Prompt Recipes
- **API Call**: `const { data } = await useGet<InlineType>('endpoint')`
- **Component**: `<script setup>` + TypeScript interfaces + accessibility
- **Page**: `useAsyncData` + auth middleware + SEO meta
