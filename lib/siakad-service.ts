import * as cheerio from "cheerio";

import { StudentBio, LoginCredentials, SiakadConfig } from "../types";
import { getSetCookies } from "./get-set-cookies";

interface CookieStore {
  [key: string]: string;
}

/**
 * PENTING: instance service ini HARUS dibuat baru di setiap request
 * (lihat api/auth/login.ts). Jangan jadikan singleton module-level,
 * karena cookie session antar user bisa saling bocor di serverless
 * yang warm-start (instance lama dipakai ulang).
 */
export class SiakadService {
  private cookies: CookieStore = {};
  private siakadUrl: string;
  private userAgent: string =
    "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0";

  constructor(config: SiakadConfig) {
    this.siakadUrl = config.siakadUrl;
    this.applyTlsBypassIfNeeded();
  }

  private parseCookies(setCookieHeaders: string[]): void {
    for (const header of setCookieHeaders) {
      const separatorIndex = header.indexOf("=");

      if (separatorIndex === -1) continue;

      const name = header.slice(0, separatorIndex).trim();

      const value = header
        .slice(separatorIndex + 1)
        .split(";")[0]
        .trim();

      if (name && value) {
        this.cookies[name] = value;
      }
    }
  }

  private getCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  /**
   * Export cookie session (buat disimpan di JWT setelah login berhasil).
   */
  exportCookieHeader(): string {
    return this.getCookieHeader();
  }

  /**
   * Restore cookie session dari JWT (skip login, langsung reuse sesi lama).
   * Dipanggil di endpoint /jadwal, /nilai, dst — bukan cuma di /login.
   */
  restoreCookieHeader(cookieHeader: string): void {
    if (!cookieHeader) return;

    for (const pair of cookieHeader.split(";")) {
      const separatorIndex = pair.indexOf("=");

      if (separatorIndex === -1) continue;

      const name = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (name && value) {
        this.cookies[name] = value;
      }
    }
  }

  /**
   * Fetch dengan cookie jar tetapi redirect dikontrol oleh caller.
   * Dipakai untuk investigasi SSO / redirect chain SLC -> Moodle.
   */
  async fetchAbsoluteResponse(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    return this.fetchWithCookies(url, options);
  }

  /**
   * Fetch 1 halaman SIAKAD pakai sesi yang sedang aktif, return raw HTML.
   * Dipakai untuk semua endpoint baru (jadwal, kalender, nilai, dst) —
   * jadi kita gak perlu nulis ulang cookie-handling tiap endpoint.
   *
   * queryParams berguna buat halaman yang filter-nya lewat query string
   * (misal ?periode=20241 di /nilai atau /presensi).
   */
  async fetchPage(
    path: string,
    queryParams?: Record<string, string>,
  ): Promise<string> {
    const url = new URL(`${this.siakadUrl}${path}`);
    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await this.fetchWithCookies(url.toString());
    const html = await response.text();

    // Heuristik: kalau sesi SIAKAD sudah expired, biasanya di-redirect balik
    // ke halaman login. TODO: sesuaikan setelah lihat HTML asli halaman
    // login SIAKAD-nya — sementara ini nebak berdasarkan pola form login umum.
    if (html.includes('name="password"') && html.includes('name="username"')) {
      throw new Error("SIAKAD_SESSION_EXPIRED");
    }

    return html;
  }

  /**
   * Node fetch (undici) tidak punya opsi `tls` seperti Bun.
   * Kalau SIAKAD punya masalah sertifikat (self-signed / invalid chain),
   * satu-satunya cara bypass di Node adalah lewat env var di bawah ini.
   *
   * PERINGATAN KEAMANAN: ini mematikan verifikasi SSL untuk SELURUH
   * proses (bukan cuma request ini). Aman-aman saja di serverless function
   * yang isolated & short-lived seperti ini, tapi JANGAN pernah pasang ini
   * kalau function yang sama juga memanggil endpoint sensitif lain.
   * Hapus baris ini kalau ternyata SIAKAD sertifikatnya valid.
   */
  private applyTlsBypassIfNeeded(): void {
    if (process.env.SIAKAD_ALLOW_INSECURE_TLS === "true") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
  }

  async collectSiakadCookies(): Promise<void> {
    try {
      const response = await fetch(this.siakadUrl, {
        method: "HEAD",
        headers: { "User-Agent": this.userAgent },
      });

      const setCookieHeaders = getSetCookies(response.headers)

      if (setCookieHeaders.length > 0) {
        const siakadCookies = setCookieHeaders
          .filter((cookie) => cookie.startsWith("siakad="))
          .sort((a, b) => b.length - a.length);

        if (siakadCookies.length > 0) {
          const longestCookie = siakadCookies[0];
          const [name, value] = longestCookie.split(";")[0].split("=");
          this.cookies[name] = value;
        }

        this.parseCookies(setCookieHeaders);
      }
    } catch (error: any) {
      // error.message Node sering cuma "fetch failed" — detail aslinya
      // (misal sertifikat SSL invalid, DNS gagal, dsb) ada di error.cause.
      console.error(
        "Failed to collect SIAKAD cookies:",
        error.message,
        "cause:",
        error.cause,
      );
      throw new Error("Failed to collect SIAKAD cookies");
    }
  }

  private async fetchWithCookies(
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const defaultHeaders: HeadersInit = {
      "User-Agent": this.userAgent,
      Accept: "text/html, */*; q=0.01",
      Origin: this.siakadUrl,
      Referer: `${this.siakadUrl}/beranda`,
      "X-Requested-With": "XMLHttpRequest",
      Cookie: this.getCookieHeader(),
    };

    const headers = {
      ...defaultHeaders,
      ...(options.headers || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const setCookieHeaders = getSetCookies(response.headers)

    if (setCookieHeaders.length > 0) {
      this.parseCookies(setCookieHeaders);
    }

    return response;
  }

  private async postForm(
    url: string,
    formParams: Record<string, string> = {},
  ): Promise<Response> {
    const formData = new URLSearchParams(formParams);
    return this.fetchWithCookies(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
  }

  async login(credentials: LoginCredentials): Promise<boolean> {
    try {
      await this.collectSiakadCookies();
      delete this.cookies["siakad"];

      const response = await this.postForm(`${this.siakadUrl}/login`, {
        username: credentials.username,
        password: credentials.password,
      });

      const body = await response.json();
      return body?.output === "ok";
    } catch (error: any) {
      console.error("Login error:", error.message);
      return false;
    }
  }

  async getStudentBio(): Promise<StudentBio> {
    const [bioResponse, ktmResponse] = await Promise.all([
      this.fetchWithCookies(`${this.siakadUrl}/mahasiswa/biodata`),
      this.fetchWithCookies(
        `${this.siakadUrl}/mahasiswa/ktm_virtual/ktm_download/orientation/template`,
      ),
    ]);

    const bioHtml = await bioResponse.text();
    const ktmHtml = await ktmResponse.text();

    const bio$ = cheerio.load(bioHtml);
    const ktm$ = cheerio.load(ktmHtml);

    // Cari <div> section berdasarkan judul h4-nya (misal "Data Diri", "Domisili"),
    // lalu ambil field di dalamnya berdasarkan teks <label>. Ini jauh lebih tahan
    // banting dibanding selector nth-child sebelumnya — gak rusak kalau SIAKAD
    // nambah/kurangin 1 elemen di tengah halaman.
    const getSection = (title: string) =>
      bio$("h4.form-section")
        .filter((_, el) => bio$(el).text().trim() === title)
        .parent();

    const getField = (
      section: ReturnType<typeof bio$>,
      label: string,
    ): string => {
      let result = "";
      section.find(".form-group").each((_, group) => {
        const thisLabel = bio$(group)
          .find(".control-label")
          .first()
          .text()
          .trim();
        if (thisLabel === label) {
          result = bio$(group)
            .find(".form-control-static")
            .first()
            .text()
            .trim();
        }
      });
      return result;
    };

    const dataDiri = getSection("Data Diri");
    const domisili = getSection("Domisili");

    const name = getField(dataDiri, "Nama Mahasiswa");
    const gender = getField(dataDiri, "Jenis Kelamin");
    const phone_number = getField(dataDiri, "No telepon (HP)");
    const email = getField(dataDiri, "Email");
    const place_of_birth = getField(dataDiri, "Kota Lahir");
    const date_of_birth = getField(dataDiri, "Tanggal Lahir");

    const alamat = getField(domisili, "Alamat");
    const kelurahan = getField(domisili, "Kelurahan");
    const kecamatan = getField(domisili, "Kecamatan");
    const kota = getField(domisili, "Kota");
    const propinsi = getField(domisili, "Propinsi");
    const address = [alamat, kelurahan, kecamatan, kota, propinsi]
      .filter(Boolean)
      .join(", ");

    const nim = ktm$("body > div.content > div > div.text-center.bold")
      .text()
      .trim();
    const study_program = ktm$("body > div.content > div > div:nth-child(4)")
      .text()
      .trim();
    const photo =
      ktm$("body > div.content > div > div.form-title > img").attr("src") || "";

    if (!nim || !name) {
      throw new Error(
        "Failed to extract biodata - NIM or name is empty. Check if still logged in.",
      );
    }

    return {
      nim,
      fullname: name,
      gender,
      phone_number,
      email,
      study_program,
      photo,
      place_of_birth,
      date_of_birth,
      address,
    };
  }
}
