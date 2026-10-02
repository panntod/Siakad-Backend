# SIAKAD-LMS-API

API serverless berbasis TypeScript untuk menghubungkan aplikasi frontend dengan SIAKAD dan LMS/SPADA.

Project ini bertindak sebagai **proxy/backend-for-frontend (BFF)**:

```text
Frontend
   │
   │ HTTP + HttpOnly Cookie
   ▼
Vercel Serverless API
   │
   ├── Authentication / JWT
   │
   ├── SIAKAD Service
   │      └── Login + session cookie jar
   │
   ├── SIAKAD HTML Parser
          └── Cheerio
```

## Features

- Login mahasiswa melalui SIAKAD.
- Session aplikasi menggunakan JWT dalam cookie `auth_token`.
- Cookie session SIAKAD disimpan di claim JWT agar request berikutnya dapat melanjutkan sesi SIAKAD.
- CORS untuk frontend dengan credential/cookie.
- Serverless deployment menggunakan Vercel.
- Parsing HTML SIAKAD menggunakan Cheerio.

## Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript | Application language |
| Vercel Functions | Serverless runtime |
| `@vercel/node` | Vercel request/response types |
| `jsonwebtoken` | JWT session |
| `cookie` | Cookie parsing/serialization |
| `cheerio` | HTML parsing |
| SIAKAD | Source system |

## Project Structure

```text
api/
├── auth/
│   ├── login.ts
│   ├── me.ts
│   └── logout.ts
│
├── lib/
│   ├── cors.ts
│   ├── get-set-cookies.ts
│   ├── login-logger.ts
│   ├── session.ts
│   └── siakad-service.ts
│
├── config.ts
├── types.ts
├── package.json
└── .env.example
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API-REFERENCE.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Development](docs/DEVELOPMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Security](docs/SECURITY.md)
- [Changelog](docs/CHANGELOG.md)

## Quick Start

```bash
cd api
npm install
```

Create `.env.local`:

```env
JWT_SECRET=replace-with-a-long-random-secret
SIAKAD_ALLOW_INSECURE_TLS=false
ALLOWED_ORIGINS=http://localhost:3000,http://yourdomain.com
```

> `SIAKAD_URL` saat ini dikonfigurasi langsung di `api/config.ts` sebagai `https://siakad.polinema.ac.id`.

Run through Vercel CLI:

```bash
npx vercel dev
```

API functions are then exposed according to the Vercel function routing convention, for example:

```text
/api/auth/login
/api/auth/me
/api/siakad/jadwal
```

## Important Security Notes

This repository handles highly sensitive student information and SIAKAD credentials.

Before production deployment, review [Security](docs/SECURITY.md).

`SIAKAD_ALLOW_INSECURE_TLS=true` disables Node TLS certificate verification for the process.

## License

This project is licensed under the [MIT License](LICENSE)