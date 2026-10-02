# API Reference

## Base URL

For local development:

```text
http://localhost:3000
```

when using the default Vercel development server.

For production:

```text
https://<your-domain>
```

The endpoint path is based on the file structure under `api/`.

---

# Authentication

## POST `/api/auth/login`

Authenticate against SIAKAD and create the application session.

### Request

```json
{
  "username": "NIM",
  "password": "PASSWORD"
}
```

### Success

```json
{
  "success": true,
  "user": {
    "nim": "12345678",
    "fullname": "Student Name",
    "gender": "...",
    "phone_number": "...",
    "email": "...",
    "study_program": "...",
    "photo": "...",
    "place_of_birth": "...",
    "date_of_birth": "...",
    "address": "..."
  }
}
```

The response also sets an HttpOnly `auth_token` cookie.

### Errors

| Status | Meaning |
|---|---|
| 400 | NIM/password missing |
| 401 | SIAKAD credentials rejected |
| 405 | Method not allowed |
| 500 | Server configuration or login processing error |

---

## GET `/api/auth/me`

Check the current application session.

### Success

```json
{
  "success": true,
  "user": {
    "nim": "...",
    "fullname": "...",
    "study_program": "...",
    "siakadCookie": "..."
  }
}
```

The exact JWT payload can contain additional profile fields.

### Errors

| Status | Meaning |
|---|---|
| 401 | No cookie, invalid JWT, expired JWT, or old session without SIAKAD cookie |

---

## POST `/api/auth/logout`

Attempts to log out from SIAKAD and always clears the local application cookie.

### Success

```json
{
  "success": true,
  "message": "Logout berhasil"
}
```

A failure to log out from SIAKAD does not prevent the local application session from being cleared.

# Common Response Format

Most JSON endpoints follow:

```json
{
  "success": true,
  "data": {}
}
```

or:

```json
{
  "success": false,
  "message": "Human-readable error"
}
```

Some endpoints add fields such as `semester` or `status`.

# Common HTTP Status Codes

| Status | Meaning |
|---|---|
| 200 | Request succeeded |
| 204 | CORS preflight succeeded |
| 400 | Invalid/missing request input |
| 401 | Not authenticated / expired SIAKAD session |
| 405 | HTTP method not supported |
| 500 | Internal/server configuration error |
| 502 | Upstream SIAKAD failure |
