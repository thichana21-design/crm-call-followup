// ระบบ session token (HMAC-SHA256 ด้วย Web Crypto — ใช้ได้ทั้ง middleware/edge และ server)
import { cookies } from "next/headers";

export type Session = { sub: number; role: string; name: string; exp: number };

export const COOKIE = "crm_session";
const SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
const MAX_AGE = 60 * 60 * 12; // 12 ชั่วโมง

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function hmacKey() {
  return crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signToken(payload: Omit<Session, "exp">): Promise<string> {
  const body: Session = { ...payload, exp: Math.floor(Date.now() / 1000) + MAX_AGE };
  const data = b64url(enc.encode(JSON.stringify(body)));
  const key = await hmacKey();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return `${data}.${b64url(sig)}`;
}

export async function verifyToken(token?: string | null): Promise<Session | null> {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  try {
    const key = await hmacKey();
    const ok = await crypto.subtle.verify("HMAC", key, fromB64url(sig), enc.encode(data));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(data))) as Session;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** อ่านผู้ใช้ปัจจุบันจาก cookie (เรียกจาก server component / action) */
export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  return verifyToken(c.get(COOKIE)?.value);
}

export const MAX_AGE_SECONDS = MAX_AGE;
