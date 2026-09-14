import { useState } from "react";
import type { Screen, FoodItem } from "../App";

const suggestions = [
  { name: "Organic Blueberries", category: "Produce", expDate: "Sep 19", daysLeft: 5, quantity: "6 oz", emoji: "🫐" },
  { name: "Reduced Fat Milk", category: "Dairy", expDate: "Sep 21", daysLeft: 7, quantity: "1/2 gallon", emoji: "🥛" },
  { name: "Sliced Turkey Breast", category: "Meat", expDate: "Sep 16", daysLeft: 2, quantity: "8 oz", emoji: "🥩" },
  { name: "Romaine Lettuce", category: "Produce", expDate: "Sep 17", daysLeft: 3, quantity: "1 head", emoji: "🥬" },
];

export default function ScanScreen({ navigate, onAddItem }: { navigate: (s: Screen) => void; onAddItem: (item: FoodItem) => void }) {
  const [phase, setPhase] = useState<"scan" | "result">("scan");
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<FoodItem | null>(null);
  const [expDate, setExpDate] = useState("");

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
      const item: FoodItem = { ...pick, id: Date.now().toString() };
      setDetected(item);
      setExpDate(pick.expDate);
      setScanning(false);
      setPhase("result");
    }, 1800);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#111" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px 12px", justifyContent: "space-between" }}>
        <button onClick={() => navigate("home")} style={{
          width: 38, height: 38, borderRadius: 14, background: "rgba(255,255,255,0.1)",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 16, color: "#fff" }}>Scan Item</span>
        <div style={{ width: 38 }} />
      </div>

      {phase === "scan" ? (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "0 32px" }}>
            {/* Viewfinder */}
            <div style={{ position: "relative", width: 240, height: 240 }}>
              {/* corners */}
              {[
                { top: 0, left: 0, borderTop: "3px solid #3D9A58", borderLeft: "3px solid #3D9A58", borderRadius: "14px 0 0 0" },
                { top: 0, right: 0, borderTop: "3px solid #3D9A58", borderRight: "3px solid #3D9A58", borderRadius: "0 14px 0 0" },
                { bottom: 0, left: 0, borderBottom: "3px solid #3D9A58", borderLeft: "3px solid #3D9A58", borderRadius: "0 0 0 14px" },
                { bottom: 0, right: 0, borderBottom: "3px solid #3D9A58", borderRight: "3px solid #3D9A58", borderRadius: "0 0 14px 0" },
              ].map((style, i) => (
                <div key={i} style={{ position: "absolute", width: 32, height: 32, ...style }} />
              ))}

              {/* Scan line */}
              {scanning && (
                <div style={{
                  position: "absolute", left: 10, right: 10, height: 2,
                  background: "linear-gradient(90deg, transparent, #3D9A58, transparent)",
                  animation: "scan 1.4s ease-in-out infinite",
                  top: "50%",
                }} />
              )}

              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {scanning ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      border: "2.5px solid #3D9A58", borderTopColor: "transparent",
                      animation: "spin .8s linear infinite",
                    }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Identifying...</span>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", opacity: 0.35 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#fff", marginTop: 8 }}>Point at item or barcode</div>
                  </div>
                )}
              </div>
            </div>

            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
              Hold your camera steady over the item
            </p>
          </div>

          {/* Controls */}
          <div style={{ padding: "0 20px 28px", display: "flex", gap: 12 }}>
            <button style={{
              width: 50, height: 50, borderRadius: 16, background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </button>
            <button
              onClick={handleScan} disabled={scanning}
              style={{
                flex: 1, height: 50, borderRadius: 16, background: "#3D9A58", border: "none", cursor: "pointer",
                fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 16, color: "#fff",
                boxShadow: "0 4px 20px rgba(61,154,88,0.4)",
                opacity: scanning ? 0.7 : 1,
              }}
            >
              {scanning ? "Scanning..." : "Tap to Scan"}
            </button>
          </div>
        </>
      ) : (
        /* Result */
        <div style={{ flex: 1, background: "#FAFAFA", borderRadius: "24px 24px 0 0", padding: 24, display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F2FAF4", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3D9A58" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#3D9A58" }}>Item found</span>
          </div>

          {detected && (
            <>
              {/* Card */}
              <div style={{
                background: "#fff", borderRadius: 22, padding: 20,
                display: "flex", alignItems: "center", gap: 16,
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>
                  {detected.emoji}
                </div>
                <div>
                  <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 18, color: "#111" }}>{detected.name}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#aaa", marginTop: 2 }}>{detected.quantity} · {detected.category}</div>
                </div>
              </div>

              {/* Exp date */}
              <div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: "#bbb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Expiration Date</div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "#fff", borderRadius: 16, padding: "0 16px", height: 50,
                  border: "1.5px solid #3D9A58",
                  boxShadow: "0 1px 6px rgba(61,154,88,0.1)",
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3D9A58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <input
                    value={expDate} onChange={(e) => setExpDate(e.target.value)}
                    style={{ flex: 1, border: "none", outline: "none", fontFamily: "'Inter', sans-serif", fontSize: 15, color: "#111", background: "transparent" }}
                  />
                  <span style={{
                    fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12,
                    color: detected.daysLeft <= 3 ? "#D4860A" : "#3D9A58",
                    background: detected.daysLeft <= 3 ? "#FFF8EC" : "#F2FAF4",
                    borderRadius: 20, padding: "4px 10px",
                  }}>
                    {detected.daysLeft}d left
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                <button onClick={() => setPhase("scan")} style={{
                  flex: 1, height: 50, borderRadius: 16, border: "none", cursor: "pointer",
                  background: "#F0F0F0", color: "#666",
                  fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15,
                }}>
                  Rescan
                </button>
                <button onClick={() => { onAddItem({ ...detected, expDate }); navigate("home"); }} style={{
                  flex: 2, height: 50, borderRadius: 16, border: "none", cursor: "pointer",
                  background: "#3D9A58", color: "#fff",
                  fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 15,
                  boxShadow: "0 4px 16px rgba(61,154,88,0.3)",
                }}>
                  Add to Kitchen
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes scan { 0% { top: 10%; } 50% { top: 88%; } 100% { top: 10%; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
