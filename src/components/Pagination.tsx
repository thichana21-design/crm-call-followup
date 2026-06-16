import Link from "next/link";
import type { CSSProperties } from "react";

const base: CSSProperties = {
  minWidth: 30, height: 30, padding: "0 8px", borderRadius: 8,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  fontSize: 13, fontWeight: 600, border: "1px solid #e2e8f0",
  background: "#f8fafc", color: "#334155", transition: "all .14s",
};
const active: CSSProperties = {
  ...base, border: "none", color: "#fff",
  background: "linear-gradient(180deg, #6366f1, #4f46e5)",
  boxShadow: "0 2px 6px -1px rgba(79,70,229,.5)",
};
const disabled: CSSProperties = { ...base, opacity: 0.4, pointerEvents: "none" };

export default function Pagination({
  page, pages, total, pageSize, makeHref,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  makeHref: (p: number) => string;
}) {
  if (pages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // หน้าต่างเลขหน้า สูงสุด 10 ปุ่ม เลื่อนตามหน้าปัจจุบัน
  const WINDOW = 10;
  let from = Math.max(1, page - Math.floor(WINDOW / 2));
  const to = Math.min(pages, from + WINDOW - 1);
  from = Math.max(1, to - WINDOW + 1);
  const nums: number[] = [];
  for (let i = from; i <= to; i++) nums.push(i);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 18 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {page > 1
          ? <Link href={makeHref(page - 1)} style={base} aria-label="ก่อนหน้า">◄</Link>
          : <span style={disabled}>◄</span>}
        {nums.map((n) =>
          n === page
            ? <span key={n} style={active}>{n}</span>
            : <Link key={n} href={makeHref(n)} style={base}>{n}</Link>
        )}
        {page < pages
          ? <Link href={makeHref(page + 1)} style={base} aria-label="ถัดไป">►</Link>
          : <span style={disabled}>►</span>}
      </div>
      <div style={{ fontSize: 13, color: "#64748b" }}>
        แสดง {start.toLocaleString()}–{end.toLocaleString()} จาก {total.toLocaleString()} รายการ
      </div>
    </div>
  );
}
