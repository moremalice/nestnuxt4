# CLAUDE.md — Project Overview

## Scope
- Monorepo: **backend/** (NestJS) + **frontend/** (Nuxt 4, SSR/CSR hybrid)
- Goal: practical, secure, performant, maintainable code. Short, direct answers.
- Full details live in `docs/`. This file is a **brief index** for Claude.

## Response Guidelines CRITICAL
- **Language**: Always reason in English internally, but provide final responses in Korean when user requests in Korean
- **Code Changes**: Show minimal diffs only (≤10 lines context)
- **Tools**: Edit for changes, Write only for new files
- **Length**: Code changes ≤50 words, features ≤150 words, refactoring ≤300 words
- **Format**: 1-2 sentences rationale, max 3 bullet points
- **Emojis**: Never use emojis in documentation or code unless explicitly requested

## Standards
- **File Naming**: kebab-case files, PascalCase components (+Component suffix)
- **TypeScript**: Explicit returns, no `any`, strict mode, Interface > Type
- **Documentation**: **MANDATORY** — All docs/ file creation/modification MUST follow docs/CONTRIBUTING.md guidelines (DRY principle, cross-linking, English language, change checklist)

## Architecture Summary
- **Auth**: Web (HttpOnly cookies + CSRF), Mobile (Bearer tokens)
- **API**: `useApi`/`useGet`/`usePost` → `/api/nestjs/*` proxy → NestJS
- **Security**: Private backend URLs (server-only), public proxy paths (client-safe)
- **SSR**: Server-side credential forwarding, no secrets in client bundles

## Tech Stack
- **Frontend**: Nuxt 4 + Vue 3.5 + Pinia + Custom CSS + 15 languages i18n
- **Backend**: NestJS + TypeORM + Multi-MySQL + JWT + CSRF + Swagger
- **Development**: Hot reload + ESLint + Prettier + Jest + E2E testing

## Quick Access
- **Backend tasks**: see @backend/CLAUDE.md
- **Frontend tasks**: see @frontend/CLAUDE.md
- **API Communication**: `docs/api-communication.md`
- **Auth & Security**: `docs/auth-security-architecture.md`, `docs/mobile-authentication.md`
- **Development Patterns**: `docs/backend-patterns.md`, `docs/frontend-patterns.md`
- **Setup & Environment**: `docs/development-setup.md`, `docs/port-management.md`
- **Contributing**: `docs/CONTRIBUTING.md`

## Prompt Recipes
- **Refactor**: Goal + constraints → minimal diff + rationale
- **Bugfix**: Symptom + repro → root cause + fix
- **Tests**: Target module → test file + run command
- **Migration**: Current → desired → incremental diffs
- **Documentation**: Read docs/CONTRIBUTING.md FIRST → Apply DRY + cross-linking + English + checklist
