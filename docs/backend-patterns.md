# Backend Architecture Patterns

## ConfigService Pattern

### Environment Configuration Setup

The backend uses `@nestjs/config` with a factory pattern for centralized, type-safe environment variable management:

```typescript
// app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: [
    `.env.${process.env.NODE_ENV ?? 'local'}`,
    '.env.local',
    '.env',
  ],
  cache: true,
  expandVariables: true,
})
```

### Configuration Factory Pattern

```typescript
// src/config/example.config.ts
import { ConfigService } from '@nestjs/config';

export const exampleConfigs = {
  default: {
    factory: (configService: ConfigService) => ({
      port: configService.get<number>('PORT', 3020),
      nodeEnv: configService.get<string>('NODE_ENV', 'local'),
      isDevelopment: configService.get<string>('NODE_ENV', 'local') !== 'production',
      // Type-safe with default values
      dbHost: configService.get<string>('DB_WORLD_HOST'),
      dbPort: configService.get<number>('DB_WORLD_PORT', 3306),
    })
  }
};
```

### Database Configuration Pattern

```typescript
// src/config/database.config.ts - Multi-database setup
export const databaseConfigs = {
  world: {
    name: 'piki_world_db',
    factory: (configService: ConfigService): TypeOrmModuleOptions => ({
      type: 'mysql',
      host: configService.get<string>('DB_WORLD_HOST'),
      port: configService.get<number>('DB_WORLD_PORT', 3306),
      username: configService.get<string>('DB_WORLD_USERNAME'),
      password: configService.get<string>('DB_WORLD_PASSWORD'),
      database: configService.get<string>('DB_WORLD_DATABASE'),
      synchronize: false,
      namingStrategy: new SnakeNamingStrategy(),
      entities: [join(__dirname, '..', '**/*.entity{.ts,.js}')],
      timezone: '+09:00',
      charset: 'utf8mb4',
      logging: configService.get<boolean>('DB_WORLD_DEV', false),
    }),
  },
  place: {
    name: 'piki_place_db',
    factory: (configService: ConfigService): TypeOrmModuleOptions => ({
      type: 'mysql',
      host: configService.get<string>('DB_PLACE_HOST'),
      port: configService.get<number>('DB_PLACE_PORT', 13306), // Different port
      username: configService.get<string>('DB_PLACE_USERNAME'),
      password: configService.get<string>('DB_PLACE_PASSWORD'),
      database: configService.get<string>('DB_PLACE_DATABASE'),
      synchronize: false,
      namingStrategy: new SnakeNamingStrategy(),
      entities: [join(__dirname, '..', '**/*.entity{.ts,.js}')],
      timezone: '+09:00',
      charset: 'utf8mb4',
      logging: configService.get<boolean>('DB_PLACE_DEV', false),
    }),
  },
  test: {
    name: 'test_user_db',
    factory: (configService: ConfigService): TypeOrmModuleOptions => ({
      type: 'mysql',
      host: configService.get<string>('DB_TEST_USER_HOST'),
      port: configService.get<number>('DB_TEST_USER_PORT', 13306),
      username: configService.get<string>('DB_TEST_USER_USERNAME'),
      password: configService.get<string>('DB_TEST_USER_PASSWORD'),
      database: configService.get<string>('DB_TEST_USER_DATABASE'),
      synchronize: false,
      namingStrategy: new SnakeNamingStrategy(),
      entities: [join(__dirname, '..', '**/*.entity{.ts,.js}')],
      timezone: '+09:00',
      charset: 'utf8mb4',
      logging: configService.get<boolean>('DB_TEST_USER_DEV', false),
    }),
  },
};
```

### Environment-Specific Configuration

```typescript
// src/config/cors.config.ts  
export const corsConfigs = {
  default: {
    factory: (configService: ConfigService): CorsOptions => {
      const nodeEnv = configService.get<string>('NODE_ENV', 'local');

      if (nodeEnv === 'production') {
        return {
          origin: ['https://pikitalk.com', 'https://www.pikitalk.com'],
          credentials: true,
          // Production-specific settings
        };
      }

      return {
        origin: true, // Allow all origins in development
        credentials: true,
        // Development-specific settings
      };
    },
  },
};
```

### Usage in Services

```typescript
// Any service can inject ConfigService
@Injectable()
export class ExampleService {
  constructor(private readonly configService: ConfigService) {}

  someMethod() {
    const port = this.configService.get<number>('PORT', 3020);
    const isDev = this.configService.get<string>('NODE_ENV', 'local') !== 'production';
    
    // Use environment variables with type safety and defaults
    if (isDev) {
      console.log(`Development server running on port ${port}`);
    }
  }
}
```

## Response Transformation Pattern

### Global Response Interceptor

The backend uses `TransformInterceptor` to ensure all API responses follow a consistent format. For complete API communication patterns, see [API Communication Architecture](./api-communication.md).

```typescript
// backend/src/common/interceptors/transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T = any> {
  status: 'success';
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        status: 'success',
        data,
      })),
    );
  }
}
```

### Error Response Pattern

Errors are handled by `HttpExceptionFilter` to maintain consistent error format:

```typescript
// Error responses follow this structure:
interface ErrorResponse {
  status: 'error';
  data: {
    name: string;    // Error type (e.g., 'BadRequestException')
    message: string; // Human-readable error message
  };
}

// Example error response:
{
  "status": "error",
  "data": {
    "name": "ValidationError", 
    "message": "Email is required"
  }
}
```

### Controller Implementation

Controllers return raw data - the interceptor handles wrapping:

```typescript
@Controller('users')
export class UserController {
  @Get()
  async getUsers(): Promise<User[]> {
    // Return raw data - interceptor will wrap in success format
    return await this.userService.findAll();
  }

  @Post()
  async createUser(@Body() userData: CreateUserDto): Promise<User> {
    // Raw data returned, automatically wrapped as:
    // { status: 'success', data: User }
    return await this.userService.create(userData);
  }
}
```

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

## Controller Pattern

Real-world controller implementation with comprehensive security features:

```typescript
@Controller('auth')
@ApiTags('AUTH')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @UseGuards(RecaptchaGuard, ProxyAwareThrottlerGuard)
  @OptionalRecaptcha({ action: 'register' })
  @Throttle({ register: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: '회원가입',
    description: '웹: CSRF Token 필수 | 모바일: X-Client-Type: mobile | reCAPTCHA: 선택적 검증'
  })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일' })
  @ApiResponse({ status: 403, description: 'CSRF Token 오류 (웹 전용)' })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: Request & { recaptchaResult?: any }
  ): Promise<RegisterResponseDto> {
    const result = await this.authService.register(registerDto);
    return {
      idx: result.user.idx,
      email: result.user.email,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ProxyAwareThrottlerGuard)
  @Throttle({ login: { ttl: 60000, limit: 10 } })
  @ApiHeader({
    name: 'X-Client-Type',
    description: '클라이언트 타입',
    required: false,
    enum: ['mobile', 'web'],
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @GetClientType() clientType: ClientType,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto, clientType);

    // Client-specific token handling
    if (clientType === ClientType.MOBILE) {
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      };
    }

    // Web client: refresh token in HttpOnly cookie
    const cookieOptions = this.authService.getRefreshTokenCookieOptions(clientType);
    const refreshCookieName = getRefreshCookieName(this.configService);
    response.cookie(refreshCookieName, result.refreshToken, cookieOptions);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, ProxyAwareThrottlerGuard)
  @Throttle({ profile: { ttl: 60000, limit: 100 } })
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  @ApiBearerAuth('access-token')
  getProfile(@Req() request: AuthenticatedRequest): { user: ProfileResponseDto } {
    const { password: _, ...userProfile } = request.user;
    return { user: userProfile };
  }
}
```

**Key Controller Patterns:**
- **Multi-Guard Strategy**: RecaptchaGuard + ProxyAwareThrottlerGuard combination
- **Client-Specific Logic**: Different response formats for web/mobile
- **Passthrough Response**: Use `@Res({ passthrough: true })` only for cookie manipulation
- **Comprehensive API Documentation**: Swagger decorators with client-specific descriptions

For authentication implementation details, see [Authentication & Security Architecture](./auth-security-architecture.md).

## Security Patterns

### reCAPTCHA Integration Pattern

The backend supports optional reCAPTCHA validation with strategic integration:

```typescript
// Optional reCAPTCHA decorator
@OptionalRecaptcha({ action: 'register' })
@UseGuards(RecaptchaGuard, ProxyAwareThrottlerGuard)
async register(
  @Body() registerDto: RegisterDto,
  @Req() request: Request & { recaptchaResult?: any }
): Promise<RegisterResponseDto> {
  // reCAPTCHA result is automatically attached to request
  const recaptchaResult = request.recaptchaResult;
  return await this.authService.register(registerDto);
}
```

**reCAPTCHA Strategy Pattern:**
```typescript
// Direct strategy usage for standalone validation
const { RecaptchaStrategy } = await import('./strategies/recaptcha.strategy');
const recaptchaStrategy = new RecaptchaStrategy(this.configService);

const result = await recaptchaStrategy.validate(
  recaptchaToken,
  clientIP,
  expectedAction
);
```

### Smart CSRF Protection Pattern

Intelligent CSRF protection with fail-open mode and client detection:

```typescript
// CSRF Service with automatic mobile detection
@Injectable()
export class CsrfService {
  shouldSkipCsrf(req: Request): boolean {
    const clientType = determineClientType(req);

    // Mobile clients automatically skip CSRF
    if (clientType === ClientType.MOBILE) {
      return true;
    }

    // Special endpoints can skip CSRF
    if (req.path === '/auth/validate-recaptcha') {
      return true;
    }

    return false;
  }
}
```

**Fail-Open Configuration:**
```typescript
// CSRF initialization with graceful degradation
private initializeCsrf() {
  this.failOpen = String(this.config.get('CSRF_STRICT') ?? 'false') !== 'true';

  try {
    this.csrfUtils = doubleCsrf({
      getSecret: () => this.getCsrfSecret(),
      ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
      // Production vs development cookie settings
      cookieName: isProd ? '__Host-csrf-token' : 'csrf-token',
    });
  } catch (error) {
    if (!this.failOpen) {
      throw new Error(`CSRF initialization failed (strict mode)`);
    }
    console.warn('⚠️ CSRF protection disabled (fail-open mode)');
  }
}
```

### Proxy-Aware Rate Limiting Pattern

Rate limiting that correctly handles proxy environments:

```typescript
// Custom throttler guard for proxy environments
@Injectable()
export class ProxyAwareThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    // Extract real IP from various proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const connectingIP = req.headers['x-connecting-ip'];

    // Priority order for IP extraction
    const clientIP = forwardedFor?.split(',')[0]?.trim() ||
                     realIP ||
                     connectingIP ||
                     req.ip ||
                     req.connection?.remoteAddress ||
                     'unknown';

    return clientIP;
  }
}
```

**Endpoint-Specific Throttling:**
```typescript
@Controller('auth')
export class AuthController {
  @UseGuards(ProxyAwareThrottlerGuard)
  @Throttle({ login: { ttl: 60000, limit: 10 } })        // 10/min for login
  @Throttle({ register: { ttl: 60000, limit: 5 } })      // 5/min for register
  @Throttle({ refresh: { ttl: 60000, limit: 20 } })      // 20/min for refresh
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

### Client Type Detection Pattern

Unified client type detection across the application:

```typescript
// Centralized client type determination
export function determineClientType(req: Request): ClientType {
  // 1. Check explicit header (highest priority)
  const clientTypeHeader = req.headers['x-client-type']?.toString().toLowerCase();
  if (clientTypeHeader === 'mobile') return ClientType.MOBILE;
  if (clientTypeHeader === 'web') return ClientType.WEB;

  // 2. Check User-Agent patterns
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';
  const mobilePatterns = [
    'react-native', 'flutter', 'dart', 'okhttp',
    'mobile', 'android', 'iphone', 'ipad'
  ];

  if (mobilePatterns.some(pattern => userAgent.includes(pattern))) {
    return ClientType.MOBILE;
  }

  // 3. Default to web
  return ClientType.WEB;
}
```

**Controller Usage:**
```typescript
@Post('login')
async login(
  @Body() loginDto: LoginDto,
  @GetClientType() clientType: ClientType,
  @Res({ passthrough: true }) response: Response,
): Promise<AuthResponseDto> {
  const result = await this.authService.login(loginDto, clientType);

  // Client-specific token handling
  if (clientType === ClientType.MOBILE) {
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken, // Mobile gets both tokens
      user: result.user,
    };
  }

  // Web client: refresh token in HttpOnly cookie
  response.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    sameSite: 'strict'
  });

  return {
    accessToken: result.accessToken,
    user: result.user,
  };
}
```

## Error Handling Pattern

### I18n-Based Error Handling

The backend uses `nestjs-i18n` for internationalized error messages:

```typescript
// Service with I18nService injection
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class ExampleService {
  constructor(
    private readonly i18n: I18nService,
    // other dependencies
  ) {}

  async someMethod(): Promise<SomeType> {
    try {
      // business logic
      const result = await this.performOperation();
      return result;
    } catch (error) {
      console.error('[ExampleService] Error:', error.message);
      throw new BadRequestException(
        this.i18n.translate('domain.ERROR_MESSAGE_KEY')
      );
    }
  }
}
```

### I18n Configuration Structure

**Language Files Structure:**
```
backend/src/common/i18n/
├── ko/
│   └── common.json    # Korean translations
├── en/
│   └── common.json    # English translations
└── custom-language.resolver.ts
```

**Translation Key Naming Convention:**
```typescript
// Format: domain.ERROR_TYPE
// Examples:
this.i18n.translate('policy.TERMS_NOT_FOUND')
this.i18n.translate('auth.INVALID_CREDENTIALS')
this.i18n.translate('community.FAQ_LIST_ERROR')
```

### Language Resolution

The system automatically detects user language through:

1. **Query Parameter** (highest priority): `?lang=ko` or `?lang=en`
2. **Custom Header**: `x-custom-lang: ko`
3. **Accept-Language Header**: Browser language preference
4. **Default**: Falls back to `en`

### Translation File Example

```json
// backend/src/common/i18n/ko/common.json
{
  "auth": {
    "EMAIL_ALREADY_EXISTS": "이미 등록된 이메일 주소입니다.",
    "INVALID_CREDENTIALS": "이메일 또는 비밀번호가 잘못되었습니다.",
    "USER_NOT_FOUND": "사용자를 찾을 수 없습니다.",
    "UNAUTHORIZED": "인증이 필요합니다."
  },
  "community": {
    "FAQ_LIST_ERROR": "FAQ 목록을 불러오는 중 오류가 발생했습니다.",
    "NOTICE_NOT_FOUND": "요청하신 공지사항을 찾을 수 없습니다."
  }
}
```

### Standard HTTP Exceptions with I18n

```typescript
// Authentication errors
throw new UnauthorizedException(
  this.i18n.translate('auth.UNAUTHORIZED')
);

// Not found errors  
throw new NotFoundException(
  this.i18n.translate('domain.RESOURCE_NOT_FOUND')
);

// Validation errors
throw new BadRequestException(
  this.i18n.translate('domain.VALIDATION_ERROR')
);

// Forbidden errors
throw new ForbiddenException(
  this.i18n.translate('auth.FORBIDDEN')
);
```

### Error Message Best Practices

1. **Use Domain Prefixes**: Group related errors by domain (`auth.`, `policy.`, `community.`)
2. **Descriptive Keys**: Use clear, descriptive key names (`EMAIL_ALREADY_EXISTS`)
3. **Consistent Format**: Follow UPPERCASE_WITH_UNDERSCORES convention
4. **User-Friendly Messages**: Write messages from user perspective
5. **Fallback**: Always provide English translations as fallback

## Related Documents

- [Authentication & Security Architecture](./auth-security-architecture.md) - Complete JWT/CSRF authentication system
- [API Communication Architecture](./api-communication.md) - API communication patterns and proxy implementation
- [Frontend Patterns (Nuxt 4)](./frontend-patterns.md) - Nuxt 4 development patterns and composables
- [Mobile Authentication Guide](./mobile-authentication.md) - Mobile app-specific authentication setup
- [Development Setup](./development-setup.md) - Environment configuration and setup guide

