import type { Screen, FoodItem } from "../App";

export default function ItemDetailScreen({ item, navigate, onRemove }: {
  item: FoodItem;
  navigate: (s: Screen) => void;
  onRemove: () => void;
}) {
  const urgent = item.daysLeft <= 1;
  const warn = !urgent && item.daysLeft <= 3;
  const expColor = urgent ? "#E05050" : warn ? "#D4860A" : "#3D9A58";
  const expBg = urgent ? "#FFF2F2" : warn ? "#FFF8EC" : "#F2FAF4";
  const expLabel = item.daysLeft === 0 ? "Expires today" : item.daysLeft === 1 ? "Expires tomorrow" : `${item.daysLeft} days left`;
  const freshPct = Math.min(100, Math.round((Math.min(item.daysLeft, 30) / 30) * 100));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FAFAFA", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", background: "#FAFAFA", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => navigate("home")} style={{
          width: 38, height: 38, borderRadius: 14, background: "#F0F0F0", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 16, color: "#111" }}>Item Detail</span>
        <button onClick={onRemove} style={{
          width: 38, height: 38, borderRadius: 14, background: "#FFF2F2", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E05050" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: "0 20px 40px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Hero */}
        <div style={{
          background: expBg, borderRadius: 28, padding: "32px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 72 }}>{item.emoji}</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 22, color: "#111" }}>{item.name}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#aaa", marginTop: 4 }}>{item.quantity} · {item.category}</div>
          </div>
          <div style={{
            padding: "8px 18px", borderRadius: 20,
            background: "#fff", color: expColor,
            fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>
            {expLabel}
          </div>
        </div>

        {/* Freshness */}
        <div style={{
          background: "#fff", borderRadius: 22, padding: "18px 18px",
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#111" }}>Freshness</span>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14, color: expColor }}>{freshPct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 10, background: "#F0F0F0", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 10,
              width: `${freshPct}%`,
              background: freshPct > 50 ? "#3D9A58" : freshPct > 20 ? "#D4860A" : "#E05050",
              transition: "width .4s",
            }} />
          </div>
        </div>

        {/* Info rows */}
        <div style={{ background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
          {[
            { label: "Expiration Date", value: item.expDate },
            { label: "Category", value: item.category },
            { label: "Quantity", value: item.quantity },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "15px 18px",
              borderBottom: i < arr.length - 1 ? "1px solid #F5F5F5" : "none",
            }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#aaa" }}>{label}</span>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#111" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Recipe nudge */}
        <div style={{ background: "#F2FAF4", borderRadius: 22, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>👨‍🍳</span>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 15, color: "#2a7a42" }}>Use it before it expires</span>
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#5a9a6a", margin: "0 0 12px" }}>
            Find recipes that use {item.name} so nothing goes to waste.
          </p>
          <button onClick={() => navigate("recipes")} style={{
            width: "100%", height: 44, borderRadius: 14, border: "none", cursor: "pointer",
            background: "#3D9A58", color: "#fff",
            fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14,
          }}>
            View Recipes →
          </button>
        </div>
      </div>
    </div>
  );
}
