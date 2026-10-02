import type { VercelRequest, VercelResponse } from "@vercel/node";

// Daftar origin frontend yang boleh akses API ini.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.ALLOWED_ORIGINS as string,
];

/**
 * Karena kita pakai cookie (withCredentials: true), Access-Control-Allow-Origin
 * TIDAK BOLEH '*' — harus origin spesifik yang di-echo balik, dan wajib
 * disertai Access-Control-Allow-Credentials: true.
 *
 * Return true kalau request adalah preflight OPTIONS (sudah di-handle & response
 * sudah dikirim) — kalau true, function pemanggil harus langsung `return`.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }

  return false;
}
