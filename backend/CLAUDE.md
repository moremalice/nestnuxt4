# CLAUDE.md — Backend (NestJS)

## Structure & Principles
- **Modular DI:** Feature modules under `src/` with clear separation of concerns
- **Multi-Database:** 3 MySQL connections (world/place/test) via TypeORM
- **DTO + Validation:** `ValidationPipe` with whitelist, transform, forbidNonWhitelisted
- **Error handling:** HttpException with global filters; TransformInterceptor for consistent responses
- **Interceptors:** Response transform/logging; Guards for auth/roles
- **Config Pattern:** ConfigService factory pattern for type-safe environment variables

## Config & Security
- **Environment Strategy:** `.env.${NODE_ENV}` → `.env.local` → `.env` priority
- **ConfigModule:** Factory pattern with type-safe access, environment-specific configs
- **Security Stack:** Helmet (prod), Throttling by route, CORS least-privilege, bcrypt rounds
- **CSRF (web):** Double-submit token pattern - verify `X-CSRF-Token` header vs `csrf-sid` cookie
- **Multi-Environment:** local/development/production with different security strictness

## Auth Architecture
- **Web Flow:** HttpOnly Refresh cookie (12h) + short-lived AT (15min); `/auth/refresh` requires CSRF and cookie
- **Mobile Flow:** Bearer AT/RT (no CSRF) with secure client storage (Keychain/Keystore)
- **Unified Guard:** Flexible authentication - accepts cookie-session OR `Authorization: Bearer`
- **Token Management:** JWT with environment-specific secrets, issuer/audience validation
- **Security:** bcrypt rounds (10), cookie SameSite/Secure, RT invalidation on logout

## Database Architecture
- **Primary DB (piki_world_db):** Main application data
- **Place DB (piki_place_db):** Geographic/location data  
- **Test DB (test_user_db):** Testing environment data
- **Connection Strategy:** Environment-specific hosts/ports, development logging toggle
- **TypeORM:** Entity-based with proper relationship mapping

## Testing Strategy
- **Unit Tests:** Services/Guards/Pipes with mocked dependencies
- **E2E Tests:** Full auth flows (login/refresh/CSRF), mobile vs web client detection
- **Security Tests:** Missing CSRF, expired/rotated tokens, unauthorized access
- **Database Tests:** Multi-connection scenarios, transaction rollbacks

## Development Patterns
- **Controller Pattern:** Use `@Res({ passthrough: true })` for cookie manipulation while preserving interceptors
- **Service Injection:** ConfigService factory pattern for type-safe environment access
- **Error Handling:** Consistent ApiResponse format via TransformInterceptor
- **Security Headers:** Environment-based security middleware configuration

## API Communication & Frontend Integration
- **Frontend Proxy:** Nuxt server receives `/api/nestjs/*` requests via security-enhanced proxy layer
- **Private URL Resolution:** Backend URLs resolved on Nuxt server-side only, hidden from client bundles
- **Environment Isolation:** Different backend URLs per environment (local/dev/prod) without client exposure
- **Standard Response Format:** Consistent `{ status: 'success'|'error', data: T }` format via TransformInterceptor
- **Compatibility Guarantee:** 100% preservation of existing NestJS structure, independent of frontend changes
- **Type Synchronization:** When creating new endpoints, define types inline in relevant frontend components for better maintainability

### Security Architecture Integration
```typescript
// Frontend server handler accesses private backend URL
const config = useRuntimeConfig()
const nestApiUrl = config.NEST_BACKEND_BASE_URL // Private, server-only

// Client code only knows proxy path
const { data } = await useNuxtPost('/api/nestjs/endpoint', body) // Public proxy
```

## TypeScript Configuration & Standards
- **Strict Mode:** Enable `noImplicitAny: true`, `strictBindCallApply: true` for better type safety
- **Target:** ES2023 minimum, use latest stable features
- **Module Resolution:** Absolute imports via baseUrl, path mapping for clean imports
- **Declaration:** Generate .d.ts files for reusable modules

## Naming Conventions (NestJS)
- **Entities:** `*.entity.ts` with PascalCase class names (e.g., `User`, `PolicyDocument`)
- **DTOs:** `*.dto.ts` with descriptive names (e.g., `CreateUserDto`, `LoginRequestDto`)
- **Services:** `*.service.ts` with feature-based naming (e.g., `AuthService`, `UserManagementService`)
- **Controllers:** `*.controller.ts` with resource naming (e.g., `AuthController`, `UsersController`)
- **Guards:** `*.guard.ts` with descriptive purpose (e.g., `JwtAuthGuard`, `RoleBasedGuard`)
- **Interfaces:** Descriptive names, optional `I` prefix (e.g., `AuthRequest`, `IUserRepository`)
- **Constants:** UPPER_SNAKE_CASE in dedicated files (e.g., `HTTP_STATUS_CODES`, `JWT_EXPIRY_TIME`)

## File Organization Standards
- **Module Structure:** `/src/module/[feature-name]/` for each business domain
- **Sub-folders:** `entities/`, `dto/`, `services/`, `controllers/`, `guards/`, `strategies/`, `interfaces/`
- **Common:** Shared utilities in `/src/common/` (pipes, filters, interceptors, guards)
- **Config:** Environment configurations in `/src/config/` with factory pattern
- **Tests:** Co-located `*.spec.ts` files, e2e tests in `/test/` directory

## Error Handling Patterns
- **Base Exceptions:** Extend HttpException for consistent error responses
- **Custom Exceptions:** Domain-specific exceptions (e.g., `UserNotFoundException`, `InvalidCredentialsException`)
- **Error Filters:** Global exception filter for consistent error formatting
- **Validation:** Use ValidationPipe with `whitelist: true`, `forbidNonWhitelisted: true`
- **Error Messages:** Internationalized error messages via I18nService

## API Documentation (Swagger)
- **Decorators:** Use `@ApiOperation`, `@ApiResponse`, `@ApiProperty` consistently
- **Response DTOs:** Separate DTOs for responses vs requests
- **Security:** Document authentication requirements with `@ApiBearerAuth`, `@ApiSecurity`
- **Examples:** Provide meaningful examples in @ApiProperty decorators

## Prompt Recipes
- **Unified Guard Implementation**: Authentication supporting both cookie session AND Bearer header
- **CSRF Middleware**: Verify `X-CSRF-Token` header vs `csrf-sid` cookie (for unsafe HTTP methods)
- **Feature Module Creation**: DTO validation + service layer + comprehensive E2E tests
- **Add New Endpoint**: Define frontend types inline within relevant components alongside backend implementation
- **Multi-DB Setup**: Configure TypeORM with environment-specific connection strings
- **ConfigService Factory**: Implement type-safe environment variable access
