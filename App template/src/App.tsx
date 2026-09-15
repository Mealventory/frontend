import { useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import ScanScreen from "./screens/ScanScreen";
import RecipesScreen from "./screens/RecipesScreen";
import ItemDetailScreen from "./screens/ItemDetailScreen";

export type Screen = "login" | "home" | "scan" | "recipes" | "item-detail";

export interface FoodItem {
  id: string;
  name: string;
  category: string;
  expDate: string;
  daysLeft: number;
  quantity: string;
  emoji: string;
}

const initialInventory: FoodItem[] = [
  { id: "1", name: "Whole Milk", category: "Dairy", expDate: "Sep 16", daysLeft: 2, quantity: "1 gallon", emoji: "🥛" },
  { id: "2", name: "Free Range Eggs", category: "Dairy", expDate: "Sep 22", daysLeft: 8, quantity: "12 eggs", emoji: "🥚" },
  { id: "3", name: "Sourdough Bread", category: "Bakery", expDate: "Sep 17", daysLeft: 3, quantity: "1 loaf", emoji: "🍞" },
  { id: "4", name: "Baby Spinach", category: "Produce", expDate: "Sep 18", daysLeft: 4, quantity: "5 oz bag", emoji: "🥬" },
  { id: "5", name: "Chicken Breast", category: "Meat", expDate: "Sep 15", daysLeft: 1, quantity: "1.5 lbs", emoji: "🍗" },
  { id: "6", name: "Cherry Tomatoes", category: "Produce", expDate: "Sep 20", daysLeft: 6, quantity: "1 pint", emoji: "🍅" },
  { id: "7", name: "Greek Yogurt", category: "Dairy", expDate: "Sep 25", daysLeft: 11, quantity: "32 oz", emoji: "🫙" },
  { id: "8", name: "Sharp Cheddar", category: "Dairy", expDate: "Oct 5", daysLeft: 21, quantity: "8 oz block", emoji: "🧀" },
  { id: "9", name: "Avocados", category: "Produce", expDate: "Sep 16", daysLeft: 2, quantity: "2 ct", emoji: "🥑" },
  { id: "10", name: "Pasta Penne", category: "Pantry", expDate: "Mar 12", daysLeft: 179, quantity: "16 oz box", emoji: "🍝" },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [inventory, setInventory] = useState<FoodItem[]>(initialInventory);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  const navigate = (s: Screen) => setScreen(s);
  const addItem = (item: FoodItem) => setInventory((p) => [item, ...p]);
  const removeItem = (id: string) => setInventory((p) => p.filter((i) => i.id !== id));
  const openItem = (item: FoodItem) => { setSelectedItem(item); setScreen("item-detail"); };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#EFEFEF",
      }}
    >
      {/* iPhone frame */}
      <div
        style={{
          width: 390,
          height: 844,
          borderRadius: 50,
          background: "#fff",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18), 0 0 0 10px #d8d8d8, 0 0 0 11px #c8c8c8",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Status bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 50, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px",
        }}>
          <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14, color: "#111" }}>9:41</span>
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
            width: 110, height: 30, background: "#111", borderRadius: 20,
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="16" height="11" viewBox="0 0 16 11"><rect x="0" y="2.5" width="2.5" height="8.5" rx="1" fill="#111" opacity="0.4"/><rect x="4" y="1.5" width="2.5" height="9.5" rx="1" fill="#111" opacity="0.6"/><rect x="8" y="0" width="2.5" height="11" rx="1" fill="#111"/><rect x="12" y="0" width="2.5" height="11" rx="1" fill="#111"/></svg>
            <svg width="14" height="10" viewBox="0 0 22 16" fill="none"><path d="M11 3.5C13.8 3.5 16.3 4.7 18 6.6L20 4.4C17.7 1.7 14.5 0 11 0C7.5 0 4.3 1.7 2 4.4L4 6.6C5.7 4.7 8.2 3.5 11 3.5Z" fill="#111"/><path d="M11 7C12.9 7 14.6 7.8 15.8 9.1L17.8 6.9C16 5.1 13.6 4 11 4C8.4 4 6 5.1 4.2 6.9L6.2 9.1C7.4 7.8 9.1 7 11 7Z" fill="#111"/><circle cx="11" cy="13" r="3" fill="#111"/></svg>
            <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0" y="1" width="20" height="9" rx="3" stroke="#111" strokeWidth="1.2" fill="none"/><rect x="1.5" y="2.5" width="15" height="6" rx="2" fill="#111"/><rect x="21" y="3.5" width="2" height="4" rx="1" fill="#111" opacity="0.5"/></svg>
          </div>
        </div>

        {/* Screen */}
        <div style={{ position: "absolute", inset: 0, top: 50, borderRadius: "0 0 50px 50px", overflow: "hidden" }}>
          {screen === "login" && <LoginScreen navigate={navigate} />}
          {screen === "home" && <HomeScreen navigate={navigate} inventory={inventory} onOpenItem={openItem} onRemoveItem={removeItem} />}
          {screen === "scan" && <ScanScreen navigate={navigate} onAddItem={addItem} />}
          {screen === "recipes" && <RecipesScreen navigate={navigate} inventory={inventory} />}
          {screen === "item-detail" && selectedItem && (
            <ItemDetailScreen item={selectedItem} navigate={navigate} onRemove={() => { removeItem(selectedItem.id); navigate("home"); }} />
          )}
        </div>

        {/* Home indicator */}
        {screen !== "login" && (
          <div style={{
            position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
            width: 120, height: 5, background: "#00000018", borderRadius: 10, zIndex: 50,
          }} />
        )}
      </div>
    </div>
  );
}
