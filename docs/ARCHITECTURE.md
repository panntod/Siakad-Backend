# Architecture

## Overview

The application is a serverless API layer between a frontend application and external academic systems.

```text
┌───────────────────────┐
│       Frontend        │
│  Vite / Web / Mobile  │
└───────────┬───────────┘
            │
            │ HTTPS
            │ Cookie: auth_token
            ▼
┌─────────────────────────────┐
│       Vercel API            │
│                             │
│ auth/*                      │
│ siakad/*                    │
│ lms/*                       │
│                             │
│  ┌─────────────────────┐    │
│  │ JWT Session         │    │
│  └─────────┬───────────┘    │
│            │                │
│  ┌─────────▼───────────┐    │
│  │ SiakadService       │    │
│  │ cookie jar          │    │
│  │ HTML fetching       │    │
│  └─────────┬───────────┘    │
└────────────┼────────────────┘
             │
       ┌─────┴───────────────┐
       ▼                     ▼
┌───────────────┐   ┌────────────────────┐
│ SIAKAD        │   │ SPADA / Moodle LMS │
│ polinema      │   │ SSO flow           │
└───────────────┘   └────────────────────┘
```

## Serverless Request Model

Each API request should create a fresh `SiakadService` instance.

This is important because the service contains an in-memory cookie jar. Reusing a module-level singleton could cause one user's SIAKAD cookies to leak into another user's request when a serverless instance is reused.

The intended pattern is:

```ts
const service = new SiakadService({
  siakadUrl: SIAKAD_URL,
});
```

not:

```ts
// Do not do this.
const service = new SiakadService(...);
```

at module scope.

## Authentication Flow

```text
Client
  │
  │ POST /api/auth/login
  │ username + password
  ▼
API
  │
  │ Login to SIAKAD
  ▼
SIAKAD
  │
  │ authenticated session cookies
  ▼
SiakadService
  │
  │ collect student profile
  │ export cookies
  ▼
API
  │
  │ JWT contains profile + siakadCookie
  ▼
Client
  │
  │ Set-Cookie: auth_token
  ▼
Browser
```

Subsequent request:

```text
Browser
  │
  │ Cookie: auth_token
  ▼
API
  │
  │ verify JWT
  │ restore siakadCookie
  ▼
SiakadService
  │
  │ request SIAKAD
  ▼
SIAKAD
```

## External Dependencies

The runtime depends on:

- SIAKAD availability.
- SIAKAD login behavior.
- SIAKAD HTML structure.
- SIAKAD TLS certificate validity.
- SPADA availability.
- Vercel serverless runtime.

A failure in any external dependency may result in `401`, `502`, or `500` responses depending on where the failure occurs.
