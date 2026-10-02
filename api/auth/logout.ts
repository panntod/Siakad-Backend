import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

import { applyCors } from "../lib/cors";
import { COOKIE_NAME, SIAKAD_URL } from "../config";
import { SiakadService } from "../lib/siakad-service";
import type { SiakadConfig } from "../types";

const JWT_SECRET = process.env.JWT_SECRET as string;

const SIAKAD_CONFIG: SiakadConfig = {
  siakadUrl: SIAKAD_URL,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const token = req.cookies?.[COOKIE_NAME];

  try {
    // Kalau token ada, logout juga dari SIAKAD
    if (token && JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as {
          siakadCookie?: string;
        };

        if (payload.siakadCookie) {
          const siakadService = new SiakadService(
            SIAKAD_CONFIG,
          );

          siakadService.restoreCookieHeader(
            payload.siakadCookie,
          );

          const response =
            await siakadService.fetchAbsoluteResponse(
              `${SIAKAD_URL}/login/logout`,
              {
                method: "GET",
                redirect: "manual",
              },
            );
        }
      } catch (error: any) {
        // Logout SIAKAD gagal tidak boleh membuat logout aplikasi gagal.
        console.warn(
          "[Logout] Gagal logout dari SIAKAD:",
          error?.message,
        );
      }
    }

    // Tetap hapus session aplikasi
    res.setHeader(
      "Set-Cookie",
      serialize(COOKIE_NAME, "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error: any) {
    console.error(
      "[Logout] Error:",
      error?.message,
    );

    // Bahkan jika terjadi error tak terduga,
    // session aplikasi tetap dihapus.
    res.setHeader(
      "Set-Cookie",
      serialize(COOKIE_NAME, "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }),
    );

    return res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  }
}