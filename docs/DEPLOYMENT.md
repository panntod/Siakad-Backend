# Deployment

## Recommended Platform

The project is structured for deployment as Vercel Serverless Functions.

The API directory is the function root.

## Vercel Project

When configuring the Vercel project, make sure the repository structure matches the deployed function paths.

The source currently expects:

```text
api/
```

to be recognized as the serverless function directory.

## Production Environment Variables

Configure:

```env
JWT_SECRET=<strong-random-secret>
SIAKAD_ALLOW_INSECURE_TLS=false
ALLOWED_ORIGINS=<frontend-url>
```

### JWT_SECRET

Use a long, random secret.

Example generation:

```bash
openssl rand -base64 48
```

Never commit the generated value.

### SIAKAD_ALLOW_INSECURE_TLS

Production should normally use:

```env
SIAKAD_ALLOW_INSECURE_TLS=false
```

or omit the variable.

Only enable it if the upstream SIAKAD certificate genuinely requires it and the security implications are understood.

## Deploy

Using Vercel CLI:

```bash
npx vercel
```

For production:

```bash
npx vercel --prod
```

The exact Vercel project configuration should be kept in the Vercel dashboard or repository configuration according to the team's deployment policy.

## Post-Deployment Checklist

### Authentication

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Verify:

- login succeeds
- `auth_token` is set
- cookie is HttpOnly
- authenticated endpoint works
- logout clears the cookie

## Deployment Risks

### Serverless timeout

Some flows involve multiple external requests, especially LMS SSO.

If a request becomes slow:

- reduce unnecessary requests
- avoid loading excessive HTML
- review redirect chains
- review platform function timeout limits

### Cookie size

The JWT contains the complete serialized SIAKAD cookie header.

This increases the JWT size.

If upstream cookies grow significantly, browser/proxy cookie limits can become a concern.

A future architecture should consider storing session state server-side rather than putting all upstream cookies into the client cookie.
