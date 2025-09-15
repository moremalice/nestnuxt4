# Mobile Authentication (Future Implementation)

## Current Status: Web-Only Project

**⚠️ Note**: This document describes mobile authentication capabilities that are implemented in the backend but not actively used in the current web-only project. This information is preserved for future mobile app development.

## Key Differences: Web vs Mobile Authentication

| Feature | Current Web Implementation | Future Mobile Implementation |
|---------|---------------------------|------------------------------|
| **Access Token Storage** | In-memory (JavaScript) | Secure Storage (KeyChain/Keystore) |
| **Refresh Token Storage** | HttpOnly Cookie | Secure Storage (KeyChain/Keystore) |
| **Refresh Token Delivery** | Cookie (automatic) | Response Body (manual) |
| **CSRF Protection** | Required | Not Required |
| **Client Identification** | Default | `X-Client-Type: mobile` header |
| **Token Lifetime** | Access: 15min, Refresh: 7d | Access: 30min, Refresh: 30d |

## Backend Support (Already Implemented)

The backend already supports mobile authentication through:

### 1. Universal Endpoints
```http
POST /auth/login
X-Client-Type: mobile

POST /auth/refresh  
X-Client-Type: mobile

POST /auth/logout
X-Client-Type: mobile
```

### 2. Automatic Client Detection
- `X-Client-Type: mobile` header (recommended)
- User-Agent patterns (React Native, Flutter, etc.)
- Different token lifetimes for mobile clients
- CSRF validation bypass for mobile

### 3. Mobile-Optimized Response Format
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "user": {
      "idx": 1,
      "email": "user@example.com",
      "isActive": true
    }
  }
}
```

## CSRF Protection: Mobile vs Web

### Current Web Implementation
- **Required**: CSRF tokens for all state-changing requests
- **Double-submit pattern**: `X-CSRF-Token` header + `csrf-sid` cookie
- **Automatic**: Handled by frontend API plugin

### Future Mobile Implementation
- **Not Required**: Mobile apps are automatically exempt
- **Explicit headers**: Mobile apps use `Authorization: Bearer` tokens
- **No cookies**: No automatic cookie submission security risks

## Configuration (Environment Variables)

Mobile-specific settings already available:

```env
# Mobile token lifetimes (longer than web for better UX)
JWT_MOBILE_ACCESS_EXPIRES_IN=30m
JWT_MOBILE_REFRESH_EXPIRES_IN=30d

# Client detection
ENABLE_MOBILE_CSRF_BYPASS=true
```

## Security Considerations for Future Mobile Apps

### 1. Token Storage Security
- **Never plain text**: Use KeyChain (iOS) / Keystore (Android)
- **Biometric protection**: Add extra authentication layer
- **Clear on logout**: Complete token cleanup required

### 2. Network Security  
- **HTTPS only**: Never send tokens over unencrypted connections
- **Certificate pinning**: Prevent MITM attacks
- **Request signing**: For critical operations

### 3. Device Security
- **Root/Jailbreak detection**: Consider blocking compromised devices
- **Device binding**: Tie tokens to device identifiers

## Testing Mobile Endpoints (cURL Examples)

Even though we're web-only, you can test mobile endpoints:

```bash
# Login with mobile client type
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Client-Type: mobile" \
  -d '{"email":"test@example.com","password":"password"}'

# Refresh token (mobile gets tokens in response body)
curl -X POST http://localhost:3000/auth/refresh \
  -H "Authorization: Bearer <refresh_token>" \
  -H "X-Client-Type: mobile"
```

## Migration Notes

### API Endpoint Evolution
- **✅ Completed**: Removed mobile-specific endpoints (`/auth/mobile/*`)
- **Current**: Universal endpoints with client type detection
- **Benefit**: Single codebase for web and future mobile

### Future Mobile Development
When mobile development begins:

1. **No backend changes needed** - All mobile auth logic is implemented
2. **Use universal endpoints** - Same as web, just add `X-Client-Type: mobile`
3. **Implement secure storage** - Platform-specific token storage
4. **Handle token refresh** - Different pattern than web cookies
5. **Skip CSRF handling** - Not needed for mobile apps

## Related Documents
- Auth & Security Architecture (Web): [`auth-security-architecture.md`](./auth-security-architecture.md)
- API Communication Protocol: [`api-communication.md`](./api-communication.md)
- Frontend Patterns (Nuxt 4): [`frontend-patterns.md`](./frontend-patterns.md)
- Backend Patterns (NestJS): [`backend-patterns.md`](./backend-patterns.md)
