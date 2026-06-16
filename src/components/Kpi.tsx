export default function Kpi({
  label, value, sub, icon, accent,
}: { label: string; value: string; sub?: string; icon: string; accent: string }) {
  return (
    <div className="card" style={{
      padding: 18, flex: 1, minWidth: 170, position: "relative", overflow: "hidden",
      background: `linear-gradient(150deg, ${accent}4d 0%, ${accent}24 55%, ${accent}14 100%)`,
      borderColor: "#e6eaf1",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 5, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{label}</div>
        <span style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center",
          background: accent, fontSize: 16, boxShadow: `0 2px 8px -2px ${accent}80` }}>{icon}</span>
      </div>
      <div style={{ fontSize: 27, fontWeight: 800, marginTop: 10, color: "#0f172a", letterSpacing: "-.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
