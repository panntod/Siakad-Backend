import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { applyCors } from '../lib/cors';
import { COOKIE_NAME } from '../config';

const JWT_SECRET = process.env.JWT_SECRET as string;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Belum login' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { siakadCookie?: string; [key: string]: unknown };

    // Cookie JWT lama (dibuat sebelum siakadCookie ditambahkan) harus dianggap
    // invalid di sini juga — kalau nggak, LoginPage bakal terus nganggap user
    // "sudah login" padahal sesi SIAKAD-nya kosong, dan gak pernah minta login ulang.
    if (!payload.siakadCookie) {
      return res.status(401).json({ success: false, message: 'Sesi lama, silakan login ulang' });
    }

    return res.status(200).json({ success: true, user: payload });
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi tidak valid / kedaluwarsa' });
  }
}