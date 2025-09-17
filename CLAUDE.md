# CLAUDE.md — Project Overview (Slim)

## Scope
- Monorepo: **backend/** (NestJS) + **frontend/** (Nuxt 4, SSR/CSR hybrid)
- Goal: practical, secure, performant, maintainable code. Short, direct answers.
- Full details live in `docs/`. This file is a **brief index** for Claude.

## Answer Style ⚠️ CRITICAL GUIDELINES

### Core Requirements (NON-NEGOTIABLE)
- **MUST** provide responses in the requested language (Korean/English as specified)
- **ALWAYS** use minimal diffs/patches - NEVER dump full files unless explicitly requested
- **REQUIRED**: Concise reasoning with actionable steps prioritized over verbose explanations
- **FORBIDDEN**: Lengthy responses when simple, direct solutions exist

### Response Format Standards
- **Code Changes**: Show only modified sections + 2-3 lines context maximum
- **Explanations**: Maximum 3 bullet points unless exceptional complexity requires more
- **File Operations**: Use Edit tool for targeted changes, Write tool only for new files
- **Reasoning**: 1-2 sentences maximum per change unless critical complexity demands more

### Examples: GOOD vs BAD Responses

#### ✅ GOOD: Minimal Diff Response
```diff
// nuxt.config.ts
- baseURL: 'http://localhost:3000'
+ baseURL: process.env.NUXT_PUBLIC_SITE_URL
```
**Rationale**: Environment-specific URL configuration for better deployment flexibility.

#### ❌ BAD: Full File Dump
```typescript
// [200+ lines of complete nuxt.config.ts file when only 1 line changed]
```

#### ✅ GOOD: Language Adherence
**User asks in Korean**: "API 설정을 업데이트해주세요"
**Response in Korean**: "API 설정을 다음과 같이 수정합니다..."

#### ❌ BAD: Language Mismatch
**User asks in Korean**: "API 설정을 업데이트해주세요"
**Response in English**: "I'll update the API configuration..."

#### ✅ GOOD: Concise Reasoning
"Updated to use environment variables for better security and deployment flexibility."

#### ❌ BAD: Verbose Explanation
"In this modern development paradigm, we must consider the importance of environment-specific configuration management, which allows us to maintain separation of concerns between different deployment targets while ensuring that sensitive configuration data is properly abstracted..."

### Measurable Quality Standards

#### Response Length Limits
- **Code-only changes**: ≤ 50 words explanation maximum
- **Feature additions**: ≤ 150 words total response maximum
- **Complex refactoring**: ≤ 300 words total response maximum
- **Architecture changes**: ≤ 500 words total response maximum

#### Code Change Guidelines
- **Single file edit**: Show ≤ 10 lines of diff context
- **Multiple file edits**: Use separate Edit tool calls, not Write tool dumps
- **New feature**: Create ≤ 3 new files maximum per response
- **Configuration changes**: Show only modified sections, never entire config files

#### Language Switching Rules
- **Korean request markers**: "해주세요", "하려면", "어떻게", Korean technical terms
- **English request markers**: Direct English questions, technical documentation requests
- **Mixed requests**: Follow the primary language (>60% of request content)
- **Response language**: Must match request language 100% (except code examples)

### 🚨 Violation Indicators & Enforcement

#### CRITICAL VIOLATIONS (Immediate Correction Required)
- **❌ LANGUAGE MISMATCH**: Responding in English to Korean request or vice versa
- **❌ FULL FILE DUMP**: Showing complete file when <10 lines changed
- **❌ VERBOSE BLOAT**: >500 word response for simple configuration change
- **❌ TOOL MISUSE**: Using Write tool when Edit tool is appropriate

#### QUALITY VIOLATIONS (Response Quality Issues)
- **⚠️ EXCESSIVE CONTEXT**: Showing >10 lines diff context for simple changes
- **⚠️ OVER-EXPLANATION**: >3 bullet points for straightforward modifications
- **⚠️ REASONING BLOAT**: >2 sentences explanation for obvious changes
- **⚠️ UNNECESSARY VERBOSITY**: Academic language instead of direct technical communication

#### ENFORCEMENT ACTIONS
- **CRITICAL VIOLATIONS**: Require immediate response correction and re-approach
- **QUALITY VIOLATIONS**: Recommend response optimization and brevity improvement
- **REPEAT VIOLATIONS**: Escalate to stricter guideline adherence protocols

#### COMPLIANCE INDICATORS ✅
- **GOOD**: Minimal diff + 1 sentence rationale + correct language
- **EXCELLENT**: Targeted solution + actionable steps + efficient communication
- **OUTSTANDING**: Zero wasted words + perfect tool usage + instant problem resolution

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
- **Security-Enhanced URLs:** Private backend URLs (server-only) + public proxy paths (client-safe). CDN URLs unified and separated from site URLs.
- **Type System:** Inline type definitions in each component for independent development and reduced dependencies.
- **SSR:** Nuxt fetches server-side with credentials when needed. Backend URLs resolved privately on server. No secrets leaked to client.
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
