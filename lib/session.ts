import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { SiakadService } from './siakad-service';
import { SiakadConfig } from '../types';
import { COOKIE_NAME, SIAKAD_URL } from '../config';

const JWT_SECRET = process.env.JWT_SECRET as string;

const SIAKAD_CONFIG: SiakadConfig = {
  siakadUrl: SIAKAD_URL,
};

interface JwtClaims {
  nim: string;
  fullname: string;
  study_program: string;
  siakadCookie: string;
}

/**
 * Panggil di awal tiap endpoint /api/siakad/*.
 * Return null kalau tidak authenticated (response 401 sudah dikirim otomatis).
 */
export function getAuthenticatedSiakadService(
  req: VercelRequest,
  res: VercelResponse
): { service: SiakadService; claims: JwtClaims } | null {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];

  if (!token) {
    res.status(401).json({ success: false, message: 'Belum login' });
    return null;
  }

  let claims: JwtClaims;
  try {
    claims = jwt.verify(token, JWT_SECRET) as JwtClaims;
  } catch {
    res.status(401).json({ success: false, message: 'Sesi tidak valid / kedaluwarsa' });
    return null;
  }

  // Cookie ini bisa kosong kalau JWT dibuat oleh versi login.ts yang lebih lama
  // (sebelum siakadCookie ditambahkan) — minta login ulang, jangan crash.
  if (!claims.siakadCookie) {
    res.status(401).json({ success: false, message: 'Sesi lama, silakan login ulang' });
    return null;
  }

  const service = new SiakadService(SIAKAD_CONFIG);
  service.restoreCookieHeader(claims.siakadCookie);

  return { service, claims };
}