# Authentication

## Overview

The application uses two related sessions:

1. **Application session** — JWT named `auth_token`.
2. **SIAKAD session** — cookies obtained after successful SIAKAD login.

The SIAKAD cookies are serialized into the JWT so serverless requests can reconstruct the upstream session.

## Login Flow

```text
POST /api/auth/login
        │
        ▼
Validate username/password
        │
        ▼
SiakadService.login()
        │
        ├── collect initial SIAKAD cookies
        └── POST /login
        │
        ▼
SIAKAD authentication
        │
        ▼
getStudentBio()
        │
        ▼
exportCookieHeader()
        │
        ▼
jwt.sign(...)
        │
        ▼
Set-Cookie: auth_token=<JWT>
```

The JWT currently expires after **7 days**.

## JWT Payload

The login handler stores profile information and the upstream SIAKAD cookie header.

Conceptually:

```json
{
  "nim": "...",
  "fullname": "...",
  "study_program": "...",
  "gender": "...",
  "phone_number": "...",
  "email": "...",
  "photo": "...",
  "siakadCookie": "..."
}
```

Do not assume this is a public token. It contains sensitive session material.

## Cookie Configuration

The application cookie is configured as:

```text
httpOnly: true
secure: true
sameSite: lax
path: /
maxAge: 7 days
```

Because it is `HttpOnly`, frontend JavaScript should not read the JWT directly.

Frontend requests that need authentication should send credentials/cookies:

```ts
fetch("/api/siakad/jadwal", {
  credentials: "include",
});
```

For Axios:

```ts
axios.get("/api/siakad/jadwal", {
  withCredentials: true,
});
```

## Session Restoration

Protected endpoints use `getAuthenticatedSiakadService()`.

The helper:

1. Reads `auth_token`.
2. Verifies the JWT.
3. Checks `siakadCookie`.
4. Creates a new `SiakadService`.
5. Restores the upstream cookie jar.
6. Returns the service to the endpoint.

This keeps session handling consistent.

## Session Expiration

There are two possible expiration layers:

### Application JWT expired

The JWT verification fails.

Return:

```http
401 Unauthorized
```

The frontend should require login again.

### SIAKAD session expired

The JWT can still be valid while the upstream SIAKAD session has expired.

The SIAKAD HTML usually returns a login page. The service detects this and endpoints return:

```http
401 Unauthorized
```

The frontend should also require login again.

## Logout

`POST /api/auth/logout` tries to log out from SIAKAD first.

Regardless of upstream logout success, it clears:

```text
auth_token
```

This ensures the local application session is terminated.

## Important Implementation Rule

Never store `SiakadService` as a global singleton.

The service contains cookies:

```ts
private cookies: CookieStore = {};
```

A singleton in a warm serverless runtime could potentially mix sessions between users.

Always instantiate per request.
