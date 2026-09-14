import { useState } from "react";
import type { Screen, FoodItem } from "../App";
import { BottomNav } from "./HomeScreen";

const allRecipes = [
  {
    id: "1", name: "Spinach & Egg Scramble", time: "12 min", difficulty: "Easy",
    match: 95, uses: ["Baby Spinach", "Free Range Eggs", "Sharp Cheddar"],
    emoji: "🥚", tag: "Breakfast",
    description: "Fluffy scrambled eggs with wilted spinach and melted cheddar.",
    steps: ["Heat butter in pan on medium heat", "Add spinach and wilt for 2 minutes", "Pour in whisked eggs, stir gently", "Fold in cheddar and serve warm"],
  },
  {
    id: "2", name: "Avocado Toast", time: "8 min", difficulty: "Easy",
    match: 90, uses: ["Avocados", "Sourdough Bread", "Cherry Tomatoes"],
    emoji: "🥑", tag: "Breakfast",
    description: "Creamy avocado on toasted sourdough with fresh tomatoes.",
    steps: ["Toast sourdough until golden", "Mash avocado with salt and lemon", "Spread on toast", "Top with halved cherry tomatoes"],
  },
  {
    id: "3", name: "Grilled Chicken Salad", time: "25 min", difficulty: "Medium",
    match: 88, uses: ["Chicken Breast", "Baby Spinach", "Cherry Tomatoes"],
    emoji: "🥗", tag: "Lunch",
    description: "Juicy grilled chicken over fresh spinach with a light vinaigrette.",
    steps: ["Season and grill chicken 6 min per side", "Rest 5 minutes, then slice", "Arrange spinach and tomatoes in bowl", "Top with chicken and drizzle dressing"],
  },
  {
    id: "4", name: "Cheesy Penne Bake", time: "30 min", difficulty: "Medium",
    match: 82, uses: ["Chicken Breast", "Pasta Penne", "Sharp Cheddar"],
    emoji: "🍝", tag: "Dinner",
    description: "Hearty baked penne with grilled chicken and rich cheddar sauce.",
    steps: ["Cook pasta al dente", "Grill and dice chicken", "Make cheddar sauce: butter, flour, milk, cheese", "Combine and bake at 375°F for 15 min"],
  },
  {
    id: "5", name: "Yogurt Parfait", time: "5 min", difficulty: "Easy",
    match: 78, uses: ["Greek Yogurt"],
    emoji: "🫙", tag: "Snack",
    description: "Layered Greek yogurt with granola and fresh berries.",
    steps: ["Spoon yogurt into a glass", "Add a layer of granola", "Top with mixed berries", "Finish with a drizzle of honey"],
  },
];

const tags = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

export default function RecipesScreen({ navigate, inventory }: { navigate: (s: Screen) => void; inventory: FoodItem[] }) {
  const [activeRecipe, setActiveRecipe] = useState<typeof allRecipes[0] | null>(null);
  const [filter, setFilter] = useState("All");
  const inventoryNames = new Set(inventory.map((i) => i.name));

  if (activeRecipe) {
    const haveAll = activeRecipe.uses.every((u) => inventoryNames.has(u));
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FAFAFA", overflowY: "auto" }}>
        {/* Back header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 12px", background: "#FAFAFA", position: "sticky", top: 0, zIndex: 10 }}>
          <button onClick={() => setActiveRecipe(null)} style={{
            width: 38, height: 38, borderRadius: 14, background: "#F0F0F0", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 16, color: "#111" }}>Recipe</span>
        </div>

        <div style={{ padding: "0 20px 100px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Hero */}
          <div style={{
            height: 150, borderRadius: 24, background: "#F2FAF4",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72,
          }}>
            {activeRecipe.emoji}
          </div>

          {/* Title */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 22, color: "#111", lineHeight: 1.2 }}>{activeRecipe.name}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#999", marginTop: 6 }}>{activeRecipe.description}</div>
            </div>
            <div style={{
              marginLeft: 12, padding: "6px 12px", borderRadius: 20, flexShrink: 0,
              background: "#F2FAF4",
            }}>
              <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 14, color: "#3D9A58" }}>{activeRecipe.match}%</span>
            </div>
          </div>

          {/* Meta pills */}
          <div style={{ display: "flex", gap: 8 }}>
            {[activeRecipe.time, activeRecipe.difficulty, activeRecipe.tag].map((val) => (
              <div key={val} style={{
                padding: "8px 14px", borderRadius: 16, background: "#fff",
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13, color: "#555",
                boxShadow: "0 1px 5px rgba(0,0,0,0.06)",
              }}>
                {val}
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: "#bbb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Ingredients</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {activeRecipe.uses.map((ing) => {
                const have = inventoryNames.has(ing);
                return (
                  <div key={ing} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "#fff", borderRadius: 16, padding: "12px 14px",
                    boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: have ? "#F2FAF4" : "#F5F5F5",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {have ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3D9A58" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      )}
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: have ? "#111" : "#bbb", flex: 1 }}>{ing}</span>
                    {have && <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: "#3D9A58" }}>In stock</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Steps */}
          <div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 12, color: "#bbb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Steps</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeRecipe.steps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: "#3D9A58", color: "#fff", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13,
                  }}>{i + 1}</div>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#444", lineHeight: 1.6, margin: 0, flex: 1, paddingTop: 3 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {haveAll && (
            <div style={{
              background: "#F2FAF4", borderRadius: 20, padding: 18,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>🎉</span>
              <div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 15, color: "#3D9A58" }}>Ready to cook!</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#6aaa7c", marginTop: 2 }}>You have all the ingredients.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const filtered = allRecipes.filter((r) => filter === "All" || r.tag === filter);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#FAFAFA" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 22, color: "#111", letterSpacing: -0.4 }}>Recipes</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#aaa", marginTop: 2, marginBottom: 14 }}>Based on what's in your kitchen</div>

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14 }}>
          {tags.map((t) => (
            <button key={t} onClick={() => setFilter(t)} style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: filter === t ? "#3D9A58" : "#fff",
              color: filter === t ? "#fff" : "#888",
              fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 13,
              boxShadow: filter === t ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 110px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((recipe) => {
            const haveCount = recipe.uses.filter((u) => inventoryNames.has(u)).length;
            const pct = Math.round((haveCount / recipe.uses.length) * 100);
            return (
              <button key={recipe.id} onClick={() => setActiveRecipe(recipe)} style={{
                background: "#fff", borderRadius: 22, padding: 16,
                border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                transition: "transform .1s",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                    {recipe.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 15, color: "#111", flex: 1, lineHeight: 1.3 }}>{recipe.name}</div>
                      <span style={{
                        fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 13,
                        color: recipe.match >= 90 ? "#3D9A58" : "#999",
                        background: recipe.match >= 90 ? "#F2FAF4" : "#F5F5F5",
                        borderRadius: 20, padding: "3px 10px", flexShrink: 0, marginLeft: 8,
                      }}>{recipe.match}%</span>
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#bbb", marginTop: 3 }}>{recipe.tag} · {recipe.time}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1, height: 5, borderRadius: 10, background: "#F0F0F0", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#3D9A58", borderRadius: 10 }} />
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "#bbb", flexShrink: 0 }}>{haveCount}/{recipe.uses.length}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav active="recipes" navigate={navigate} />
    </div>
  );
}
