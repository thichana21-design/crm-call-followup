import "./globals.css";
import Nav from "@/components/Nav";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/auth-actions";
import { prisma } from "@/lib/prisma";
import { bangkokTodayEnd } from "@/lib/dates";

export const metadata = {
  title: "CRM โทรติดตามลูกค้า",
  description: "ระบบ CRM ติดตามลูกค้าขาดฝาก",
};

// ทุกหน้าเป็น dynamic — กัน build ไปแตะฐานข้อมูล (layout มี query นับนัด)
export const dynamic = "force-dynamic";

const roleLabel: Record<string, string> = { admin: "ผู้จัดการ", lead: "หัวหน้าทีม", agent: "แอดมิน" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // จำนวนนัดที่ถึงกำหนดวันนี้ (ของผู้ใช้) สำหรับ badge บนเมนูคิว
  let dueCount = 0;
  if (session) {
    dueCount = await prisma.customer.count({
      where: {
        status: "active",
        nextCallAt: { not: null, lte: bangkokTodayEnd() },
        ...(session.role === "agent" ? { assignedAgentId: session.sub } : {}),
      },
    });
  }

  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {session ? (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <aside className="sidebar">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 22px" }}>
                <span style={{ width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center",
                  background: "linear-gradient(180deg,#6366f1,#4338ca)", fontSize: 19, boxShadow: "0 4px 12px -4px rgba(67,56,202,.7)" }}>📋</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#fff", lineHeight: 1.1 }}>CRM ติดตามลูกค้า</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>ลูกค้าขาดฝาก</div>
                </div>
              </div>

              <Nav role={session.role} dueCount={dueCount} />

              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                <a href="/profile" style={{ display: "block", background: "rgba(255,255,255,.05)", borderRadius: 11, padding: "11px 13px", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{session.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{roleLabel[session.role] || session.role} · ดูโปรไฟล์ →</div>
                </a>
                <form action={logout}>
                  <button type="submit" style={{ width: "100%", padding: "8px", borderRadius: 9, border: "1px solid rgba(255,255,255,.12)",
                    background: "transparent", color: "#cbd5e1", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                    ออกจากระบบ
                  </button>
                </form>
              </div>
            </aside>
            <main style={{ flex: 1, padding: "30px 38px", maxWidth: 1320 }}>{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
