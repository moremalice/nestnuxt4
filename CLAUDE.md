# CLAUDE.md — Project Overview (Slim)

## Scope
- Monorepo: **backend/** (NestJS) + **frontend/** (Nuxt 4, SSR/CSR hybrid)
- Goal: practical, secure, performant, maintainable code. Short, direct answers.
- Full details live in `docs/`. This file is a **brief index** for Claude.

## Answer Style
- Provide clear, concise responses in the requested language.
- Prefer minimal diffs/patches over full-file dumps unless requested.
- Show reasoning succinctly; prioritize actionable steps and correctness.

## Documentation Language Policy
- **All documentation files in `docs/` must be written in English** for consistency and accessibility.
- **Code comments and inline documentation should be in English** to maintain professional standards.
- **Variable names, function names, and API endpoints should use English terminology**.
- **User-facing content** (frontend UI, error messages for end users) may use localized languages as appropriate.
- When updating existing Korean documentation, translate to English and maintain the same structure.

## Core Architecture (summary)
- **Web auth:** HttpOnly refresh cookie + short-lived access token (in memory). **CSRF: double-submit token** on state-changing requests.
- **Mobile auth:** Bearer (AT/RT) without cookies; store RT in secure storage (Keychain/Keystore). CSRF not applicable.
- **API Communication:** Modern `useNuxtApi` series (useFetch-based). Backend access through `/api/nestjs/*` proxy layer.
- **Type System:** Inline type definitions in each component for independent development and reduced dependencies.
- **SSR:** Nuxt fetches server-side with credentials when needed. Keep API base consistent via env/proxy. Avoid leaking secrets to client.
- **Single domain (prod):** `/api/**` → Nest, others → Nuxt SSR (reverse proxy).

## Coding Rules (anchors)
- **Frontend (Nuxt 4):** Composition API + `<script setup>`, Pinia for state, Custom CSS with CSS variables, lazy routes/components. **API:** `useNuxtApi`/`useNuxtGet`/`useNuxtPost` with automatic loading management via API plugin.
- **Backend (NestJS):** Modular DI, DTO + ValidationPipe, Guards for auth, Interceptors for transform/logging, Helmet/CORS/Throttling by env, config via ConfigModule, multi-database setup (world/place/test).
- **Security:** No secrets in client bundles. No tokens in localStorage for web. Use SameSite/Path/Secure cookies properly. CSRF double-submit pattern with Auth Store integration.

## Naming Conventions & File Structure
- **File Naming:** kebab-case for files, PascalCase for components (add `Component` suffix)
- **Constants:** UPPER_SNAKE_CASE for constants, camelCase for variables
- **Interfaces:** Descriptive names, prefer Interface over Type alias
- **Folders:** Feature-based grouping, consistent depth (max 3 levels recommended)

## TypeScript Standards
- **Type Safety:** Explicit return types, minimize `any` usage, enable strict mode
- **Generics:** Use `ApiResponse<T>` pattern, consistent generic naming
- **Error Handling:** Typed errors, proper exception hierarchy
- **Imports:** Absolute paths preferred, group imports by source (node_modules → internal)

## Quick Access
- **Backend tasks:** see @backend/CLAUDE.md
- **Frontend tasks:** see @frontend/CLAUDE.md  
- **Overall architecture:** Core Architecture section in this file

## Where to Read Details
- **API Communication Guide:** `docs/api-communication.md` ⭐ (unified documentation)
- **Web/Mobile auth & CSRF:** `docs/auth-security-architecture.md`, `docs/mobile-authentication.md`
- **Patterns:** `docs/frontend-patterns.md`, `docs/backend-patterns.md`
- **Dev/Ports/Deploy:** `docs/development-setup.md`, `docs/port-management.md`
- **Contributing:** `docs/CONTRIBUTING.md`

## Key Technologies Summary
- **Backend:** NestJS + TypeORM + Multi-MySQL + JWT + CSRF + Swagger
- **Frontend:** Nuxt 4 + Vue 3.5 + Pinia + Custom CSS + Auto-loading API + 15 languages i18n
- **Security:** HttpOnly cookies + Double-submit CSRF + Bearer tokens (mobile)
- **Development:** Hot reload + ESLint + Prettier + Jest + E2E testing

## Prompt Recipes (copy & use)
### Refactor (small scope)
- Goal: (what/why), Constraints: API unchanged, tests pass
- Output: minimal diff + 2–3 bullets rationale

### Bugfix
- Symptom, Repro, Expected vs Actual, Suspects
- Output: minimal diff + root cause paragraph

### Write Unit Tests
- Target module/file, Framework (Jest/Vitest), Critical path + edge cases
- Output: test file + run command

### Migration / Integration
- Current snippet → desired state, breaking changes to watch
- Output: ordered checklist + incremental diffs
