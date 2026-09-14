import { useState } from "react";
import type { Screen, FoodItem } from "../App";

export function BottomNav({ active, navigate }: { active: Screen; navigate: (s: Screen) => void }) {
  return (
    <div style={{
      position: "absolute", bottom: 12, left: 16, right: 16, zIndex: 40,
      display: "flex", alignItems: "center", justifyContent: "space-around",
      background: "#fff",
      borderRadius: 28,
      padding: "10px 8px",
      boxShadow: "0 4px 30px rgba(0,0,0,0.10)",
    }}>
      <NavItem label="Kitchen" active={active === "home"} onClick={() => navigate("home")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={active === "home" ? "#3D9A58" : "none"} stroke={active === "home" ? "#3D9A58" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </NavItem>

      {/* Scan button */}
      <button
        onClick={() => navigate("scan")}
        style={{
          width: 56, height: 56, borderRadius: 20, border: "none", cursor: "pointer",
          background: "#3D9A58",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: -20,
          boxShadow: "0 6px 20px rgba(61,154,88,0.35)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
        </svg>
      </button>

      <NavItem label="Recipes" active={active === "recipes"} onClick={() => navigate("recipes")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active === "recipes" ? "#3D9A58" : "#bbb"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2l1.5 1.5M12 2v2M21 2l-1.5 1.5M4.22 10.22A8 8 0 1 0 19.78 10.22"/><path d="M12 12v-2M12 16h.01"/>
        </svg>
      </NavItem>
    </div>
  );
}

function NavItem({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "0 16px" }}>
      {children}
      <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 11, color: active ? "#3D9A58" : "#bbb" }}>{label}</span>
    </button>
  );
}

const categories = ["All", "Produce", "Dairy", "Meat", "Bakery", "Pantry"];

function expColor(days: number) {
  if (days <= 1) return { color: "#E05050", bg: "#FFF2F2" };
  if (days <= 3) return { color: "#D4860A", bg: "#FFF8EC" };
  return { color: "#3D9A58", bg: "#F2FAF4" };
}

export default function HomeScreen({ navigate, inventory, onOpenItem }: {
  navigate: (s: Screen) => void;
  inventory: FoodItem[];
  onOpenItem: (item: FoodItem) => void;
  onRemoveItem: (id: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const expiringSoon = inventory.filter((i) => i.daysLeft <= 3).length;

  const filtered = inventory.filter((item) =>
    (filter === "All" || item.category === filter) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FAFAFA" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0", background: "#FAFAFA" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 22, color: "#111", letterSpacing: -0.4 }}>My Kitchen</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#aaa", marginTop: 2 }}>{inventory.length} items</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {expiringSoon > 0 && (
              <div style={{ background: "#FFF8EC", borderRadius: 20, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4860A" }} />
                <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: "#D4860A" }}>{expiringSoon} expiring</span>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fff", borderRadius: 16, padding: "0 14px",
          height: 44, marginBottom: 14,
          boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Search your kitchen..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#111" }}
          />
        </div>

        {/* Category chips */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }}>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: filter === cat ? "#3D9A58" : "#fff",
              color: filter === cat ? "#fff" : "#888",
              fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13,
              boxShadow: filter === cat ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
              transition: "all .15s",
            }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 110px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((item) => {
            const { color, bg } = expColor(item.daysLeft);
            return (
              <button key={item.id} onClick={() => onOpenItem(item)} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 14px",
                background: "#fff", borderRadius: 20, border: "none", cursor: "pointer",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                textAlign: "left", width: "100%",
                transition: "transform .1s",
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 16, background: "#F5F5F5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, flexShrink: 0,
                }}>
                  {item.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#aaa", marginTop: 2 }}>{item.quantity} · {item.category}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 12,
                    color, background: bg, borderRadius: 20, padding: "4px 10px",
                  }}>
                    {item.daysLeft <= 0 ? "Today" : item.daysLeft === 1 ? "1 day" : `${item.daysLeft}d`}
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#ccc" }}>{item.expDate}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav active="home" navigate={navigate} />
    </div>
  );
}
