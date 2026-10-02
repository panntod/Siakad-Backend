# Development Guide

## Prerequisites

Recommended:

- Node.js compatible with the Vercel Node runtime.
- npm.
- Vercel CLI for local serverless testing.
- Access to a valid SIAKAD account for integration testing.

## Install Dependencies

```bash
cd api
npm install
```

## Environment

Create `.env.local`.

Example:

```env
JWT_SECRET=your-long-random-secret
SIAKAD_ALLOW_INSECURE_TLS=false
VITE_BASE_URL=http://localhost:5173
```

The SIAKAD URL is currently hard-coded in:

```text
../config.ts
```

```ts
export const SIAKAD_URL = "https://siakad.polinema.ac.id";
```

## Run Locally

If Vercel CLI is installed:

```bash
npx vercel dev
```

Test:

```bash
curl -i http://localhost:3000/api/auth/me
```

Expected without login:

```json
{
  "success": false,
  "message": "Belum login"
}
```

## Login Test

```bash
curl -i \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_NIM","password":"YOUR_PASSWORD"}' \
  http://localhost:3000/api/auth/login
```

For browser-based testing, let the browser manage the `HttpOnly` cookie.

## Testing Authenticated Requests

When using curl, capture cookies:

```bash
curl -i -c cookies.txt \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_NIM","password":"YOUR_PASSWORD"}' \
  http://localhost:3000/api/auth/login
```

Then:

```bash
curl -i -b cookies.txt \
  http://localhost:3000/api/siakad/jadwal
```

## Adding a New SIAKAD Endpoint

Recommended pattern:

```text
api/siakad/example.ts
```

Use:

```ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import * as cheerio from "cheerio";

import { applyCors } from "../lib/cors";
import { getAuthenticatedSiakadService } from "../lib/session";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (applyCors(req, res)) return;

  const auth = getAuthenticatedSiakadService(req, res);
  if (!auth) return;

  try {
    const html = await auth.service.fetchPage("/path/to/siakad/page");
    const $ = cheerio.load(html);

    const data = {};

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error.message === "SIAKAD_SESSION_EXPIRED") {
      return res.status(401).json({
        success: false,
        message: "Sesi SIAKAD habis, silakan login ulang",
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data",
    });
  }
}
```

## HTML Parser Guidelines

Prefer semantic selectors based on:

- IDs
- stable class names
- table structure
- labels
- section headings

Avoid brittle selectors such as long `nth-child` chains when a stable label or section selector exists.

For example, this is more maintainable:

```ts
$("h4.form-section")
```

combined with matching section titles than depending on a fixed element index.

## Upstream Request Guidelines

Use `SiakadService` rather than manually implementing cookies in every endpoint.

Available helpers include:

```ts
fetchPage()
fetchAbsoluteResponse()
fetchPresensi()
fetchKtm()
fetchBeranda()
getStudentBio()
```

## Adding Types

Shared types belong in:

```text
api/types.ts
```

Keep endpoint-specific response types local when they are not shared.

## CORS

Allowed frontend origins are currently defined in:

```text
api/lib/cors.ts
```

Current local origins:

```text
http://localhost:5173
http://localhost:4173
```

and:

```text
process.env.VITE
```

Because authentication uses cookies, do not replace the origin with `*`.

## Before Opening a Pull Request

Check:

- [ ] No credentials are hard-coded.
- [ ] No real passwords are committed.
- [ ] No JWT or SIAKAD cookies are logged.
- [ ] No production secrets are included.
- [ ] New endpoint validates its method.
- [ ] New endpoint handles authentication.
- [ ] SIAKAD session expiry returns `401`.
- [ ] Parser handles empty/no-data states.
- [ ] Upstream errors do not expose sensitive HTML.
- [ ] Diagnostic code is not exposed unintentionally.
