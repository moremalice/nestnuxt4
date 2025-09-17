# Backend Architecture Patterns

## Configuration Management

### Environment Setup Pattern

**Implementation:** `src/app.module.ts:24`

Environment configuration with multiple file priority and variable expansion:
- `.env.${NODE_ENV}` (highest priority)
- `.env.local`
- `.env` (fallback)

**Key Features:**
- Global configuration access via `ConfigService`
- Type-safe environment variable access with defaults
- Automatic variable expansion support

### Multi-Database Configuration

**Implementation:** `src/config/database.config.ts`

Factory pattern for multiple MySQL database connections:
- `piki_world_db`: Main application data
- `piki_place_db`: Location/geographic data (port 13306)
- `test_user_db`: Test environment data

**Usage in Services:**
```typescript
@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(EntityName, 'piki_world_db')
    private readonly repository: Repository<EntityName>
  ) {}
}
```

### Environment-Specific Configuration

**Implementation:** `src/config/cors.config.ts`

Configuration factories that adapt to environment:
- Production: Restricted CORS origins
- Development: Permissive settings for local development

## API Response Patterns

**Complete Documentation:** [API Communication Architecture](./api-communication.md)

### Unified Response Format
- **Success:** `{ status: 'success', data: T }` via `TransformInterceptor`
- **Error:** `{ status: 'error', data: { name, message } }` via `HttpExceptionFilter`

**Implementation:**
- `src/common/interceptors/transform.interceptor.ts`
- `src/common/filters/http-exception.filter.ts`

### Controller Pattern
Controllers return raw data - interceptors handle response wrapping automatically. Use `@Res({ passthrough: true })` only for cookie/header manipulation.

## Module Structure Template

Each backend module follows this consistent structure:

```
src/module/{module-name}/
├── {module}.controller.ts      # API endpoints
├── {module}.service.ts         # Business logic
├── {module}.module.ts          # Module configuration
├── dto/                        # Data transfer objects
├── entities/                   # TypeORM entities
├── guards/                     # Authentication guards (if needed)
├── interfaces/                 # TypeScript interfaces
└── strategies/                 # Passport strategies (auth module only)
```

## Database Connection Pattern

```typescript
// Service pattern with explicit database connection
@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(EntityName, 'piki_world_db')    // Primary database
    private readonly repository: Repository<EntityName>
  ) {}
}

// Available connections:
// - 'piki_world_db': Main application data
// - 'piki_place_db': Location/geographic data  
// - 'test_user_db': Test environment data
```

## DTO Validation Pattern

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsString, IsOptional, Min, Max } from 'class-validator';

export class ExampleDto {
  @ApiProperty({ example: 'example', description: 'Example field' })
  @IsString()
  field: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(100)
  page?: number;
}
```

## Response Standardization Pattern

For detailed response transformation and API communication patterns, see [API Communication Architecture](./api-communication.md).

### Key Response Principles

- **Automatic Wrapping**: All successful responses use `{ status: 'success', data: T }` format
- **Error Consistency**: Errors follow `{ status: 'error', data: { name, message } }` format
- **Passthrough Usage**: Only use `@Res({ passthrough: true })` for cookie/header manipulation
- **No Direct Response**: Avoid direct `response.json()` calls to maintain interceptor benefits

## Controller Patterns

**Example Implementation:** `src/module/auth/auth.controller.ts`

### Key Patterns
- **Multi-Guard Strategy:** Combined guards for security layers (`RecaptchaGuard` + `ProxyAwareThrottlerGuard`)
- **Client-Specific Logic:** Different response handling for web vs mobile clients
- **Passthrough Response:** Use `@Res({ passthrough: true })` only for cookie/header manipulation
- **Comprehensive Documentation:** Swagger decorators with client-specific descriptions

### Real-World Example
The AuthController demonstrates:
- Guard composition for layered security
- Client type detection and conditional logic
- Proper cookie handling for web clients
- Rate limiting per endpoint type
- Swagger documentation with multiple response scenarios

For complete authentication patterns, see [Authentication & Security Architecture](./auth-security-architecture.md).

## Security Patterns

**Complete Documentation:** [Authentication & Security Architecture](./auth-security-architecture.md)

### Core Security Features
- **JWT Authentication:** Dual-token system with client-specific policies
- **CSRF Protection:** Smart protection with mobile bypass
- **reCAPTCHA Integration:** Optional validation with fail-open mode
- **Rate Limiting:** Proxy-aware throttling per endpoint
- **Client Detection:** Unified web/mobile client identification

**Implementation Locations:**
- `src/module/auth/`: JWT strategies and authentication
- `src/module/security/`: CSRF and client detection
- `src/common/guards/`: Rate limiting and proxy handling

## Error Handling & I18n

**Configuration:** `src/config/i18n.config.ts`

### Internationalized Error Messages

**Language Detection Priority:**
1. Query parameter: `?lang=ko` or `?lang=en`
2. Custom header: `x-custom-lang: ko`
3. Accept-Language header (browser preference)
4. Default fallback: `en`

**Translation Structure:**
```
src/common/i18n/
├── ko/common.json    # Korean translations
├── en/common.json    # English translations
└── custom-language.resolver.ts
```

### Service Pattern

**Usage in Services:**
```typescript
@Injectable()
export class ExampleService {
  constructor(private readonly i18n: I18nService) {}

  async someMethod() {
    throw new BadRequestException(
      this.i18n.translate('auth.INVALID_CREDENTIALS')
    );
  }
}
```

**Key Naming Convention:** `domain.ERROR_TYPE` (e.g., `auth.UNAUTHORIZED`, `community.FAQ_LIST_ERROR`)

For complete error response handling, see [API Communication Architecture](./api-communication.md).

## Related Documents

- [Authentication & Security Architecture](./auth-security-architecture.md) - Complete JWT/CSRF authentication system and advanced security patterns
- [API Communication Architecture](./api-communication.md) - Response transformation, proxy implementation, and error handling
- [Frontend Patterns (Nuxt 4)](./frontend-patterns.md) - Nuxt 4 development patterns and composables
- [Mobile Authentication Guide](./mobile-authentication.md) - Mobile app-specific authentication setup
- [Development Setup](./development-setup.md) - Environment configuration and setup guide

