"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "ภาพรวม", icon: "📊", roles: ["admin", "lead"] },
  { href: "/queue", label: "คิวโทรวันนี้", icon: "📞", roles: ["admin", "lead", "agent"] },
  { href: "/calls", label: "บันทึกการโทร", icon: "🗓️", roles: ["admin", "lead", "agent"] },
  { href: "/customers", label: "ลูกค้า", icon: "👥", roles: ["admin", "lead", "agent"] },
  { href: "/reports", label: "รายงาน", icon: "📈", roles: ["admin", "lead"] },
  { href: "/admin/sms-templates", label: "คลังข้อความ SMS", icon: "💬", roles: ["admin", "lead"] },
  { href: "/admin/notifications", label: "แจ้งเตือน Telegram", icon: "🔔", roles: ["admin", "lead"] },
  { href: "/brands", label: "เว็บ/แบรนด์", icon: "🏷️", roles: ["admin", "lead"] },
  { href: "/users", label: "จัดการผู้ใช้", icon: "⚙️", roles: ["admin"] },
  { href: "/admin/audit", label: "บันทึกการตรวจสอบ", icon: "🔍", roles: ["admin"] },
];

export default function Nav({ role, dueCount = 0 }: { role: string; dueCount?: number }) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  return (
    <nav style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {nav.filter((n) => n.roles.includes(role)).map((n) => (
        <Link key={n.href} href={n.href} className={`nav-link ${isActive(n.href) ? "active" : ""}`}>
          <span className="nav-ico">{n.icon}</span>
          {n.label}
          {n.href === "/queue" && dueCount > 0 && (
            <span style={{ marginLeft: "auto", background: "#dc2626", color: "#fff", fontSize: 11, fontWeight: 700,
              minWidth: 20, height: 20, borderRadius: 999, display: "grid", placeItems: "center", padding: "0 6px" }}>
              {dueCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
