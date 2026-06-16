export default function Kpi({
  label, value, sub, icon, accent,
}: { label: string; value: string; sub?: string; icon: string; accent: string }) {
  return (
    <div className="card" style={{ padding: 18, flex: 1, minWidth: 170, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{label}</div>
        <span style={{ width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center",
          background: `${accent}1a`, fontSize: 15 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 27, fontWeight: 800, marginTop: 8, color: "#0f172a", letterSpacing: "-.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
