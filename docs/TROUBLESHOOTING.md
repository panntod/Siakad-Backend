# Troubleshooting

## 401 — Belum login

### Symptom

```json
{
  "success": false,
  "message": "Belum login"
}
```

### Checks

1. Confirm the browser sends cookies.
2. Confirm the request uses credentials:

```ts
fetch(url, {
  credentials: "include",
});
```

3. Check that `/api/auth/login` returned `Set-Cookie`.
4. Check that the cookie is not blocked by browser policy.
5. Confirm the request is using HTTPS in production.

---

## 401 — Sesi tidak valid / kedaluwarsa

The application JWT has expired or failed verification.

Action:

```text
Login again.
```

If this happens immediately after deployment, verify:

- `JWT_SECRET` is configured.
- The same secret is used by all relevant function instances.
- The cookie was not copied from another environment.

---

## 401 — Sesi SIAKAD habis

The JWT may still be valid, but the upstream SIAKAD session is no longer valid.

The service detects the SIAKAD login page and returns `401`.

Action:

```text
Clear local session → login again.
```

---

## 405 — Method not allowed

Check the endpoint method.

Examples:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/siakad/jadwal
```

---

## 500 — Server misconfigured

Check environment variables:

```env
JWT_SECRET=...
```

If `JWT_SECRET` is missing, authentication endpoints cannot create or verify sessions.
