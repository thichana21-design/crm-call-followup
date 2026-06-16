import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE } from "@/lib/auth";

const ADMIN_ONLY = ["/", "/brands", "/users", "/reports"];
const ADMIN_ONLY_PREFIX = ["/api/export", "/admin", "/reports"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // cron endpoints ป้องกันด้วย CRON_SECRET เอง — ข้าม middleware auth
  if (pathname.startsWith("/api/cron")) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;
  const session = await verifyToken(token);

  // หน้าที่เข้าได้โดยไม่ต้องล็อกอิน
  const PUBLIC = ["/login", "/forgot"];

  // ยังไม่ล็อกอิน
  if (!session) {
    if (PUBLIC.includes(pathname)) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ล็อกอินแล้วแต่เข้า /login -> ไปหน้าแรก
  if (pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = session.role === "agent" ? "/queue" : "/";
    return NextResponse.redirect(url);
  }

  // แอดมิน (role=agent / พนักงานโทร) เข้าหน้าเฉพาะผู้จัดการไม่ได้
  if (session.role === "agent") {
    const blocked =
      ADMIN_ONLY.includes(pathname) ||
      ADMIN_ONLY_PREFIX.some((p) => pathname.startsWith(p));
    if (blocked) {
      const url = req.nextUrl.clone();
      url.pathname = "/queue";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // ยกเว้นไฟล์ static และ asset ภายใน
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
