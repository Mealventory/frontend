import React, { createContext, useContext, useState, useMemo } from "react";
import { FoodItem, Recipe } from "../types";

export const initialInventory: FoodItem[] = [
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

export const initialRecipes: Recipe[] = [
  {
    id: "1",
    name: "Spinach & Egg Scramble",
    time: "12 min",
    difficulty: "Easy",
    match: 95,
    uses: ["Baby Spinach", "Free Range Eggs", "Sharp Cheddar"],
    emoji: "🍳",
    tag: "Breakfast",
    description: "Fluffy scrambled eggs with wilted spinach and melted cheddar.",
    steps: [
      "Heat butter in pan on medium heat",
      "Add spinach and wilt for 2 minutes",
      "Pour in whisked eggs, stir gently into curds",
      "Fold in cheddar cheese and serve warm",
    ],
  },
  {
    id: "2",
    name: "Avocado Toast",
    time: "8 min",
    difficulty: "Easy",
    match: 90,
    uses: ["Avocados", "Sourdough Bread", "Cherry Tomatoes"],
    emoji: "🥑",
    tag: "Breakfast",
    description: "Creamy avocado on toasted sourdough with fresh tomatoes.",
    steps: [
      "Toast sourdough until golden and crisp",
      "Mash avocado with salt, pepper and a squeeze of lemon",
      "Spread generously on toast",
      "Top with halved cherry tomatoes and chili flakes",
    ],
  },
  {
    id: "3",
    name: "Grilled Chicken Salad",
    time: "25 min",
    difficulty: "Medium",
    match: 88,
    uses: ["Chicken Breast", "Baby Spinach", "Cherry Tomatoes"],
    emoji: "🥗",
    tag: "Lunch",
    description: "Juicy grilled chicken over fresh spinach with a light vinaigrette.",
    steps: [
      "Season chicken with olive oil, salt, garlic, and herbs",
      "Grill 6 minutes per side until thoroughly cooked",
      "Rest 5 minutes, then slice thinly",
      "Arrange baby spinach and tomatoes in bowl, top with chicken and drizzle dressing",
    ],
  },
  {
    id: "4",
    name: "Cheesy Penne Bake",
    time: "30 min",
    difficulty: "Medium",
    match: 82,
    uses: ["Chicken Breast", "Pasta Penne", "Sharp Cheddar"],
    emoji: "🍝",
    tag: "Dinner",
    description: "Hearty baked penne with grilled chicken and rich cheddar sauce.",
    steps: [
      "Cook penne pasta al dente in salted boiling water",
      "Grill and dice chicken breast",
      "Prepare creamy cheddar sauce with butter, milk, and cheese",
      "Combine pasta, chicken, and sauce; bake at 375°F (190°C) for 15 minutes",
    ],
  },
  {
    id: "5",
    name: "Yogurt Parfait",
    time: "5 min",
    difficulty: "Easy",
    match: 78,
    uses: ["Greek Yogurt"],
    emoji: "🫙",
    tag: "Snack",
    description: "Layered Greek yogurt with granola and fresh berries.",
    steps: [
      "Spoon Greek yogurt into a glass or bowl",
      "Add a generous layer of crunchy granola",
      "Top with fresh berries or sliced fruit",
      "Finish with a light drizzle of raw honey",
    ],
  },
];

export type FigmaScreen = "login" | "home" | "scan" | "recipes" | "item-detail" | "settings";

export interface UserProfile {
  name: string;
  email: string;
  household: string;
  initials: string;
}

interface InventoryContextType {
  inventory: FoodItem[];
  recipes: Recipe[];
  currentScreen: FigmaScreen;
  selectedItem: FoodItem | null;
  selectedRecipe: Recipe | null;
  expiringSoonCount: number;
  user: UserProfile;
  isAuthenticated: boolean;
  navigate: (screen: FigmaScreen) => void;
  addItem: (item: FoodItem) => void;
  removeItem: (id: string) => void;
  openItem: (item: FoodItem) => void;
  openRecipe: (recipe: Recipe) => void;
  login: (email?: string) => void;
  logout: () => void;
}

const defaultUser: UserProfile = {
  name: "Pablo Gomez",
  email: "pablo@mealventory.app",
  household: "Ordonez Family Kitchen",
  initials: "PG",
};

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [inventory, setInventory] = useState<FoodItem[]>(initialInventory);
  const [currentScreen, setCurrentScreen] = useState<FigmaScreen>("home");
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(initialInventory[0]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const expiringSoonCount = useMemo(
    () => inventory.filter((item) => item.daysLeft <= 3).length,
    [inventory]
  );

  const dynamicRecipes = useMemo(() => {
    const pantryItemNames = new Set(inventory.map((i) => i.name.toLowerCase()));
    return initialRecipes.map((recipe) => {
      const haveCount = recipe.uses.filter((ing) =>
        pantryItemNames.has(ing.toLowerCase())
      ).length;
      const match = Math.round((haveCount / recipe.uses.length) * 100);
      return { ...recipe, match };
    });
  }, [inventory]);

  const addItem = (item: FoodItem) => {
    setInventory((prev) => [item, ...prev]);
  };

  const removeItem = (id: string) => {
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  const openItem = (item: FoodItem) => {
    setSelectedItem(item);
    setCurrentScreen("item-detail");
  };

  const openRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentScreen("recipes");
  };

  const login = (email?: string) => {
    if (email) {
      setUser((prev) => ({
        ...prev,
        email,
        name: email.split("@")[0],
        initials: email.slice(0, 2).toUpperCase(),
      }));
    }
    setIsAuthenticated(true);
    setCurrentScreen("home");
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentScreen("login");
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        recipes: dynamicRecipes,
        currentScreen,
        selectedItem,
        selectedRecipe,
        expiringSoonCount,
        user,
        isAuthenticated,
        navigate: setCurrentScreen,
        addItem,
        removeItem,
        openItem,
        openRecipe,
        login,
        logout,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
