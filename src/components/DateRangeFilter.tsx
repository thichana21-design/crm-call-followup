import Link from "next/link";
import { presets, Range } from "@/lib/date";

/**
 * ตัวกรองช่วงวันที่ (server component)
 * basePath = path ของหน้าปัจจุบัน, extra = query อื่นที่ต้องคงไว้ (เช่น brand)
 */
export default function DateRangeFilter({
  basePath,
  range,
  extra = {},
}: {
  basePath: string;
  range: Range;
  extra?: Record<string, string | undefined>;
}) {
  const buildHref = (from: string, to: string) => {
    const p = new URLSearchParams();
    Object.entries(extra).forEach(([k, v]) => v && p.set(k, v));
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const activeKey = (() => {
    const ps = presets();
    const m = ps.find((p) => p.from === (range.from || "") && p.to === (range.to || ""));
    return m?.key;
  })();

  return (
    <div className="card" style={{ padding: 14, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {presets().map((p) => (
          <Link key={p.key} href={buildHref(p.from, p.to)}
            className={`btn ${activeKey === p.key ? "" : "btn-ghost"}`}
            style={{ padding: "6px 13px", fontSize: 13 }}>
            {p.label}
          </Link>
        ))}
      </div>

      <form method="get" action={basePath} style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexWrap: "wrap" }}>
        {Object.entries(extra).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
        <span style={{ fontSize: 13, color: "#64748b" }}>เลือกช่วง</span>
        <input type="date" name="from" defaultValue={range.from || ""} />
        <span style={{ color: "#94a3b8" }}>→</span>
        <input type="date" name="to" defaultValue={range.to || ""} />
        <button type="submit" className="btn" style={{ padding: "7px 14px" }}>ดู</button>
      </form>
    </div>
  );
}
