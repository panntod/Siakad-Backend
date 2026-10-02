import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { SiakadConfig, LoginCredentials } from "../../types";
import { SiakadService } from "../../lib/siakad-service";
import { applyCors } from "../../lib/cors";
import { COOKIE_NAME, SIAKAD_URL } from "../../config";

const SIAKAD_CONFIG: SiakadConfig = {
  siakadUrl: SIAKAD_URL,
};

const JWT_SECRET = process.env.JWT_SECRET as string;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return; // preflight OPTIONS sudah dihandle

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  if (!JWT_SECRET) {
    console.error("JWT_SECRET env var is not set");
    return res
      .status(500)
      .json({ success: false, message: "Server misconfigured" });
  }

  const { username, password } = (req.body ?? {}) as LoginCredentials;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "NIM dan password wajib diisi" });
  }

  // Instance BARU tiap request — jangan dijadikan singleton module-level.
  const siakadService = new SiakadService(SIAKAD_CONFIG);

  try {
    const isLoggedIn = await siakadService.login({ username, password });

    if (!isLoggedIn) {
      return res
        .status(401)
        .json({ success: false, message: "NIM atau password salah" });
    }

    const studentBio = await siakadService.getStudentBio();
    const siakadCookie = siakadService.exportCookieHeader();

    const token = jwt.sign(
      {
        nim: studentBio.nim,
        fullname: studentBio.fullname,
        study_program: studentBio.study_program,
        gender: studentBio.gender,
        phone_number: studentBio.phone_number,
        email: studentBio.email,
        photo: studentBio.photo,

        // Simpan seluruh cookie session SIAKAD.
        // Termasuk:
        // - siakad
        // - siakad_sess
        // - polinema_sso

        // Endpoint SIAKAD/LMS berikutnya dapat
        // restore cookie ini tanpa login ulang.
        siakadCookie,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Token disimpan sebagai httpOnly cookie — TIDAK bisa dibaca JS di
    // browser (lebih aman dari XSS dibanding simpan di localStorage / js-cookie).
    res.setHeader(
      "Set-Cookie",
      serialize(COOKIE_NAME, token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 hari
      }),
    );

    return res.status(200).json({
      success: true,
      user: studentBio,
    });
  } catch (error: any) {
    console.error("Login handler error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat login ke SIAKAD",
    });
  }
}
