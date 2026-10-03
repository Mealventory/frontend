import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert } from "react-native";
import { Session } from "@supabase/supabase-js";
import { FoodItem, Recipe } from "../types";
import { supabase } from "../lib/supabase";
import {
  createHousehold as apiCreateHousehold,
  getHouseholdItems,
  getHouseholds,
  joinHousehold as apiJoinHousehold,

  Household,
  HouseholdItem,
} from "../lib/api";

export const initialInventory: FoodItem[] = [];

export const initialRecipes: Recipe[] = [
  {
    id: "1",
    name: "Spinach & Egg Scramble",
    time: "12 min",
    difficulty: "Easy",
    match: 0,
    uses: ["Baby Spinach", "Free Range Eggs", "Sharp Cheddar"],
    emoji: "🍳",
    tag: "Breakfast",
    description:
      "Fluffy scrambled eggs with wilted spinach and melted cheddar.",
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
    match: 0,
    uses: ["Avocados", "Sourdough Bread", "Cherry Tomatoes"],
    emoji: "🥑",
    tag: "Breakfast",
    description:
      "Creamy avocado on toasted sourdough with fresh tomatoes.",
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
    match: 0,
    uses: ["Chicken Breast", "Baby Spinach", "Cherry Tomatoes"],
    emoji: "🥗",
    tag: "Lunch",
    description:
      "Juicy grilled chicken over fresh spinach with a light vinaigrette.",
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
    match: 0,
    uses: ["Chicken Breast", "Pasta Penne", "Sharp Cheddar"],
    emoji: "🍝",
    tag: "Dinner",
    description:
      "Hearty baked penne with grilled chicken and rich cheddar sauce.",
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
    match: 0,
    uses: ["Greek Yogurt"],
    emoji: "🥣",
    tag: "Snack",
    description:
      "Layered Greek yogurt with granola and fresh berries.",
    steps: [
      "Spoon Greek yogurt into a glass or bowl",
      "Add a generous layer of crunchy granola",
      "Top with fresh berries or sliced fruit",
      "Finish with a light drizzle of raw honey",
    ],
  },
];

export type FigmaScreen =
  | "login"
  | "home"
  | "scan"
  | "recipes"
  | "item-detail"
  | "settings";

export interface UserProfile {
  name: string;
  email: string;
  household: string;
  initials: string;
}

interface AuthResult {
  hasHousehold: boolean;
  emailConfirmationRequired: boolean;
}

interface InventoryContextType {
  inventory: FoodItem[];
  recipes: Recipe[];
  currentScreen: FigmaScreen;
  selectedItem: FoodItem | null;
  selectedRecipe: Recipe | null;
  expiringSoonCount: number;
  user: UserProfile;
  household: Household | null;
  householdId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  navigate: (screen: FigmaScreen) => void;
  addItem: (item: FoodItem) => void;
  removeItem: (id: string) => void;
  openItem: (item: FoodItem) => void;
  openRecipe: (recipe: Recipe) => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  createHousehold: (name: string) => Promise<Household>;
  joinHousehold: (inviteCode: string) => Promise<Household>;
  refreshUserData: () => Promise<void>;
}

const emptyUser: UserProfile = {
  name: "Guest",
  email: "",
  household: "No household",
  initials: "G",
};

function mapInventoryItem(item: HouseholdItem): FoodItem {
  const daysLeft = item.expiry_date
    ? Math.ceil(
        (new Date(`${item.expiry_date}T00:00:00`).getTime() -
          new Date().setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24),
      )
    : 999;

  const emojiByCategory: Record<string, string> = {
    Produce: "🥬",
    Dairy: "🥛",
    Meat: "🍗",
    Bakery: "🍞",
    Pantry: "🥫",
    Beverage: "🧃",
    Snacks: "🍿",
  };

  const expiry = item.expiry_date
    ? new Date(`${item.expiry_date}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "No expiry";

  const quantity = `${String(item.quantity)} ${item.unit}`;

  return {
    id: item.id,
    name: item.name,
    category: item.category ?? "Pantry",
    expDate: expiry,
    daysLeft,
    quantity,
    emoji: emojiByCategory[item.category ?? "Pantry"] ?? "🍽️",
  };
}

const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined,
);

export function InventoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [currentScreen, setCurrentScreen] =
    useState<FigmaScreen>("login");
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [user, setUser] = useState<UserProfile>(emptyUser);
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const expiringSoonCount = useMemo(
    () => inventory.filter((item) => item.daysLeft <= 3).length,
    [inventory],
  );

  const dynamicRecipes = useMemo(() => {
    const pantryItemNames = new Set(
      inventory.map((item) => item.name.toLowerCase()),
    );

    return initialRecipes.map((recipe) => {
      const haveCount = recipe.uses.filter((ingredient) =>
        pantryItemNames.has(ingredient.toLowerCase()),
      ).length;

      const match =
        recipe.uses.length === 0
          ? 0
          : Math.round((haveCount / recipe.uses.length) * 100);

      return { ...recipe, match };
    });
  }, [inventory]);

  const resetAuthState = () => {
    setIsAuthenticated(false);
    setInventory([]);
    setHousehold(null);
    setHouseholdId(null);
    setUser(emptyUser);
    setCurrentScreen("login");
    setSelectedItem(null);
    setSelectedRecipe(null);
  };

  const loadSessionData = async (session: Session) => {
    const email = session.user.email ?? "";
    const fallbackName = email.split("@")[0] || "User";
    const fallbackInitials = fallbackName.slice(0, 2).toUpperCase();

   

    const households = await getHouseholds();
    const selectedHousehold = households[0] ?? null;

    setIsAuthenticated(true);
    setUser({
      name: fallbackName,
      email,
      household: selectedHousehold?.name ?? "No household",
      initials: fallbackInitials,
    });

    setHousehold(selectedHousehold);
    setHouseholdId(selectedHousehold?.id ?? null);

    if (selectedHousehold) {
      const items = await getHouseholdItems(selectedHousehold.id);
      const mapped = items.map(mapInventoryItem);

      setInventory(mapped);
      setSelectedItem(mapped[0] ?? null);
      setCurrentScreen("home");
    } else {
      setInventory([]);
      setSelectedItem(null);
      setCurrentScreen("home");
    }
  };

  const refreshUserData = async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      resetAuthState();
      return;
    }

    await loadSessionData(data.session);
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (data.session) {
          await loadSessionData(data.session);
        } else {
          resetAuthState();
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);
        resetAuthState();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      if (event === "SIGNED_OUT" || !session) {
        resetAuthState();
        return;
      }

      setTimeout(() => {
        if (!mounted) {
          return;
        }

        loadSessionData(session).catch((error) => {
          console.error("Failed to load authenticated user:", error);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error("Login succeeded but no session was returned.");
    }

    await loadSessionData(data.session);

    return {
      hasHousehold: Boolean(household),
      emailConfirmationRequired: false,
    };
  };

  const signup = async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      return {
        hasHousehold: false,
        emailConfirmationRequired: true,
      };
    }

    await loadSessionData(data.session);

    const households = await getHouseholds();

    return {
      hasHousehold: households.length > 0,
      emailConfirmationRequired: false,
    };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }

    resetAuthState();
  };

  const createHousehold = async (name: string) => {
    const created = await apiCreateHousehold(name);

    setHousehold(created);
    setHouseholdId(created.id);
    setUser((prev) => ({
      ...prev,
      household: created.name,
    }));

    const items = await getHouseholdItems(created.id);
    const mapped = items.map(mapInventoryItem);

    setInventory(mapped);
    setSelectedItem(mapped[0] ?? null);
    setCurrentScreen("home");

    return created;
  };

  const joinHousehold = async (inviteCode: string) => {
    const joined = await apiJoinHousehold(inviteCode);

    setHousehold(joined);
    setHouseholdId(joined.id);
    setUser((prev) => ({
      ...prev,
      household: joined.name,
    }));

    const items = await getHouseholdItems(joined.id);
    const mapped = items.map(mapInventoryItem);

    setInventory(mapped);
    setSelectedItem(mapped[0] ?? null);
    setCurrentScreen("home");

    return joined;
  };

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
        household,
        householdId,
        isAuthenticated,
        loading,
        navigate: setCurrentScreen,
        addItem,
        removeItem,
        openItem,
        openRecipe,
        login,
        signup,
        logout,
        createHousehold,
        joinHousehold,
        refreshUserData,
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