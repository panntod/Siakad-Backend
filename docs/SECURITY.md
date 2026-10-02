# Security

This API handles student credentials, personal data, academic data, financial data, and upstream session cookies.

Treat it as a security-sensitive application.

## Critical Issues Found in Current Source

## 1. TLS Verification Bypass

`SiakadService` contains:

```ts
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
```

when:

```env
SIAKAD_ALLOW_INSECURE_TLS=true
```

This disables TLS certificate verification for the Node process.

### Required action

Prefer:

```env
SIAKAD_ALLOW_INSECURE_TLS=false
```

and fix the upstream certificate instead.

If the bypass is temporarily unavoidable, isolate it to a controlled environment and understand that it weakens transport security.

## 2. JWT Contains Upstream Session Cookies

The JWT contains:

```text
siakadCookie
```

which can contain authenticated SIAKAD session cookies.

Therefore:

- never log the JWT
- never expose it to frontend JavaScript
- keep `HttpOnly`
- use HTTPS
- use a strong JWT secret
- avoid putting the JWT in query strings
- invalidate sessions when necessary


## 3. HTML Leakage in Errors

Do not return upstream HTML to clients.

Current production-facing endpoints generally return generic error messages, which is preferable.

Keep raw upstream HTML only in controlled server-side debugging.

## 4. CORS

Because authentication uses cookies, CORS must use explicit allowed origins.

Do not change:

```http
Access-Control-Allow-Origin: *
```

when:

```http
Access-Control-Allow-Credentials: true
```

is being used.

Review the allowed origin list before production.

## 5. CSRF

The application uses cookie-based authentication.

`SameSite=Lax` provides some browser-level protection, but CSRF should still be considered in the threat model.

For state-changing endpoints, especially future POST/PUT/DELETE endpoints, consider:

- CSRF tokens
- strict origin checks
- SameSite policy
- explicit method validation

## 6. Secret Management

Never commit:

```text
.env
.env.local
JWT_SECRET
SIAKAD passwords
auth_token
siakadCookie
```

Use Vercel environment variables or another secret manager.