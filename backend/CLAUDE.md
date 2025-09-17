# CLAUDE.md — Backend (NestJS)

## Core Patterns
- **Modular DI**: Feature modules under `src/`, clear separation
- **Multi-DB**: 3 MySQL (world/place/test) via TypeORM
- **DTO + Validation**: ValidationPipe with whitelist/transformS
- **Auth**: Unified guard (cookie OR Bearer), CSRF double-submit
- **Config**: Factory pattern for type-safe environment access

## Structure
- **Modules**: `/src/module/[feature]/` (entities/, dto/, services/, controllers/, guards/)
- **Common**: Shared utilities in `/src/common/`
- **Config**: Environment configs in `/src/config/`
- **Tests**: Co-located `*.spec.ts`, e2e in `/test/`

## Key Patterns
- **Response Format**: `{ status: 'success'|'error', data: T }` via TransformInterceptor
- **Error Handling**: HttpException → Global filters → Consistent format
- **Validation**: ValidationPipe with `whitelist: true`, `forbidNonWhitelisted: true`
- **Controllers**: `@Res({ passthrough: true })` for cookie manipulation

## Naming Conventions
- **Files**: `*.entity.ts`, `*.dto.ts`, `*.service.ts`, `*.controller.ts`, `*.guard.ts`
- **Classes**: PascalCase (User, CreateUserDto, AuthService, AuthController)
- **Constants**: UPPER_SNAKE_CASE in dedicated files

## Integration
- **Frontend Access**: Nuxt `/api/nestjs/*` → Backend private URLs
- **Type Sync**: Define types inline in frontend components
- **Environment**: Private backend URLs (server-only), public proxy paths

## Prompt Recipes
- **New Endpoint**: DTO + validation + service + controller + inline frontend types
- **Auth Guard**: Support both cookie session AND Bearer header
- **Module**: Feature module with E2E tests
