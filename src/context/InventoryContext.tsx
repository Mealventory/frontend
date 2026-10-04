import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { inventoryRequest, toFoodItem, InventoryRow, NewItem } from '../lib/inventoryApi';
import { useAuth } from './AuthContext';
import { FoodItem, Recipe } from "../types";
import {
  loadSavedRecipes,
  recipeSaveKey,
} from "../lib/savedRecipes";

import { householdSavedRecipes } from "../lib/householdSavedRecipes";
import { INVENTORY_QUERY_ROOT, inventoryQueryKey } from "../lib/queryClient";

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
  savedRecipes: Recipe[];
  savedRecipesLoading: boolean;
  savedRecipesError: string;
  refreshSavedRecipes: () => Promise<void>;
  shareLocalRecipes: () => Promise<void>;
  isRecipeSaved: (recipe: Recipe) => boolean;
  toggleSavedRecipe: (recipe: Recipe) => Promise<boolean>;
  currentScreen: FigmaScreen;
  selectedItem: FoodItem | null;
  selectedRecipe: Recipe | null;
  expiringSoonCount: number;
  user: UserProfile;
  isAuthenticated: boolean;
  navigate: (screen: FigmaScreen) => void;
  updateItem: (id: string, patch: Partial<NewItem>) => Promise<void>;
  addItem: (item: FoodItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  transitionItem: (id: string, action: 'consume' | 'discard') => Promise<void>;
  refreshInventory: () => Promise<void>;
  inventoryLoading: boolean;
  inventoryError: string;
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

export function InventoryProvider({ children, demo = false }: { children: React.ReactNode; demo?: boolean }) {
  const { session, household } = useAuth();
  const queryClient = useQueryClient();
  const [demoInventory, setDemoInventory] = useState<FoodItem[]>(initialInventory);
  const scope = demo ? 'demo' : `${session?.user.id || ''}:${household?.id || ''}`;
  const activeScope = useRef(scope); activeScope.current = scope;
  const mutations = useRef(0);
  const previousUserId = useRef(session?.user.id);

  const inventoryKey = useMemo(
    () => inventoryQueryKey(session?.user.id, household?.id),
    [session?.user.id, household?.id],
  );

  const token = useCallback(async () => {
    const result = await supabase?.auth.getSession();
    if (!result?.data.session || result.error || result.data.session.user.id !== session?.user.id) {
      throw new Error('Please sign in again.');
    }
    return result.data.session.access_token;
  }, [session?.user.id]);

  const inventoryQuery = useQuery<FoodItem[]>({
    queryKey: inventoryKey,
    enabled: !demo && Boolean(session?.user.id && household?.id),
    queryFn: async () => {
      if (!household?.id) return [];
      const rows = await inventoryRequest<InventoryRow[]>(await token(), household.id);
      return rows.map(toFoodItem);
    },
  });

  const inventory = demo ? demoInventory : (inventoryQuery.data ?? []);
  const [inventoryRefreshing, setInventoryRefreshing] = useState(false);
  const inventoryLoading =
    inventoryRefreshing || (!demo && inventory.length === 0 && inventoryQuery.isPending);
  const inventoryError =
    !demo && inventory.length === 0 && inventoryQuery.error
      ? inventoryQuery.error instanceof Error
        ? inventoryQuery.error.message
        : 'Could not load inventory.'
      : '';

  const refreshInventory = useCallback(async () => {
    if (demo || !session?.user.id || !household?.id || mutations.current) return;
    setInventoryRefreshing(true);
    try {
      await inventoryQuery.refetch({ cancelRefetch: true });
    } finally {
      setInventoryRefreshing(false);
    }
  }, [demo, session?.user.id, household?.id, inventoryQuery.refetch]);

  const refreshInventoryQuietly = useCallback(async () => {
    if (demo || !session?.user.id || !household?.id || mutations.current) return;
    await inventoryQuery.refetch({ cancelRefetch: false });
  }, [demo, session?.user.id, household?.id, inventoryQuery.refetch]);

  useEffect(() => {
    const previous = previousUserId.current;
    const current = session?.user.id;
    if (previous && previous !== current) {
      queryClient.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === INVENTORY_QUERY_ROOT && query.queryKey[1] === previous,
      });
    }
    previousUserId.current = current;
  }, [session?.user.id, queryClient]);

  const [currentScreen, setCurrentScreen] = useState<FigmaScreen>("home");
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(initialInventory[0]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const savedRecipesRef = useRef<Recipe[]>([]);
  savedRecipesRef.current = savedRecipes;
  const [savedRecipesLoading, setSavedRecipesLoading] = useState(false);
  const [savedRecipesError, setSavedRecipesError] = useState('');
  const [savedScope, setSavedScope] = useState(scope);
  const savedRevision = useRef(0);
  const savedFetchScope = useRef<string | null>(null);
  const savingScope = useRef<string | null>(null);
  const refreshSavedRecipes = async () => {
    if (demo || !household || !session || savingScope.current === scope || savedFetchScope.current === scope) return;
    savedFetchScope.current = scope;
    const revision = ++savedRevision.current;
    try {
      const recipes = await householdSavedRecipes(await token(), household.id);
      if (activeScope.current !== scope || revision !== savedRevision.current) return;
      setSavedRecipes(recipes); savedRecipesRef.current = recipes; setSavedScope(scope); setSavedRecipesError('');
    } catch (error) {
      if (activeScope.current === scope && revision === savedRevision.current) setSavedRecipesError(error instanceof Error ? error.message : 'Could not sync recipes.');
    } finally {
      if (savedFetchScope.current === scope) savedFetchScope.current = null;
      if (activeScope.current === scope && revision === savedRevision.current) setSavedRecipesLoading(false);
    }
  };
  const [user, setUser] = useState<UserProfile>(defaultUser);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  useEffect(() => {
    setSelectedItem(null);
    setSelectedRecipe(null);
    setCurrentScreen('home');
    if (demo) {
      setDemoInventory(initialInventory);
      return;
    }
    if (!session?.user.id || !household?.id) return;

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshInventoryQuietly();
    }, 5000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshInventoryQuietly();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [scope, demo, refreshInventoryQuietly]);

  useEffect(() => {
    savedRevision.current++;
    setSavedRecipes([]); savedRecipesRef.current = []; setSavedScope(scope); setSavedRecipesError('');
    setSavedRecipesLoading(!demo && Boolean(session && household));
    void refreshSavedRecipes();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refreshSavedRecipes(); }, 5000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refreshSavedRecipes(); });
    return () => { savedRevision.current++; clearInterval(timer); listener.remove(); };
  }, [demo, scope]);
  const accountName = session?.user.user_metadata?.username || session?.user.user_metadata?.display_name || session?.user.email?.split('@')[0] || '';
  const accountUser = session ? {
    name: accountName, email: session.user.email || '',
    household: household?.name || 'Choose a household', initials: accountName.slice(0, 2).toUpperCase(),
  } : user;

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

  const addItem = async (item: FoodItem) => {
    if (demo) { setDemoInventory(prev => [item, ...prev]); return; }
    if (!household || !session) throw new Error('Choose a household first.');
    const quantity = item.quantity.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (!quantity || Number(quantity[1]) <= 0) throw new Error('Enter a quantity such as 2 items or 500 g.');
    mutations.current++;
    try {
      await queryClient.cancelQueries({ queryKey: inventoryKey, exact: true });
      const row = await inventoryRequest<InventoryRow>(await token(), household.id, 'POST', undefined, {
        storage_zone: item.storageZone, name: item.name, category: item.category, quantity: Number(quantity[1]), unit: quantity[2] || 'units', expiry_date: item.expiryDate || null, image_ref: item.imageRef ?? null,
      });
      if (activeScope.current === scope) {
        queryClient.setQueryData<FoodItem[]>(inventoryKey, previous => [
          toFoodItem(row),
          ...(previous ?? []).filter(i => i.id !== row.id),
        ]);
      }
    } finally { mutations.current--; }
  };

  const updateItem = async (id: string, patch: Partial<NewItem>) => {
    if (demo) {
      const updateDemoItem = (item: FoodItem): FoodItem => {
        if (item.id !== id) return item;
        const existingQuantity = item.quantity.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
        const quantityValue = patch.quantity ?? Number(existingQuantity?.[1] || 1);
        const quantityUnit = patch.unit ?? existingQuantity?.[2] ?? 'units';
        const expiryDate = patch.expiry_date !== undefined ? patch.expiry_date : item.expiryDate;
        const expiry = expiryDate ? new Date(`${expiryDate}T00:00:00`) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
          ...item,
          name: patch.name ?? item.name,
          category: patch.category ?? item.category,
          quantity: `${quantityValue} ${quantityUnit}`,
          expiryDate,
          expDate: expiry
            ? expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'Not set',
          daysLeft: expiry
            ? Math.round((expiry.getTime() - today.getTime()) / 86400000)
            : 36500,
          storageZone: patch.storage_zone ?? item.storageZone,
          imageRef: patch.image_ref !== undefined ? patch.image_ref : item.imageRef,
        };
      };
      setDemoInventory(prev => prev.map(updateDemoItem));
      setSelectedItem(prev => prev ? updateDemoItem(prev) : prev);
      return;
    }
    if (!household || !session) throw new Error('Choose a household first.');
    mutations.current++;
    try {
      await queryClient.cancelQueries({ queryKey: inventoryKey, exact: true });
      const row = await inventoryRequest<InventoryRow>(await token(), household.id, 'PATCH', id, patch);
      if (activeScope.current === scope) {
        const updated = toFoodItem(row);
        queryClient.setQueryData<FoodItem[]>(inventoryKey, previous =>
          (previous ?? []).map(item => item.id === id ? updated : item),
        );
        setSelectedItem(prev => prev?.id === id ? updated : prev);
      }
    } finally { mutations.current--; }
  };

  const removeItem = async (id: string) => {
    if (demo) { setDemoInventory(prev => prev.filter(item => item.id !== id)); setSelectedItem(null); return; }
    if (!household || !session) throw new Error('Choose a household first.');
    mutations.current++;
    try {
      await queryClient.cancelQueries({ queryKey: inventoryKey, exact: true });
      await inventoryRequest<void>(await token(), household.id, 'DELETE', id);
      if (activeScope.current === scope) {
        queryClient.setQueryData<FoodItem[]>(inventoryKey, previous =>
          (previous ?? []).filter(item => item.id !== id),
        );
        setSelectedItem(prev => prev?.id === id ? null : prev);
      }
    } finally { mutations.current--; }
  };

  const transitionItem = async (id: string, action: 'consume' | 'discard') => {
    if (demo) { setDemoInventory(prev => prev.filter(item => item.id !== id)); setSelectedItem(null); return; }
    if (!household || !session) throw new Error('Choose a household first.');
    mutations.current++;
    try {
      await queryClient.cancelQueries({ queryKey: inventoryKey, exact: true });
      await inventoryRequest<InventoryRow>(await token(), household.id, 'POST', id, undefined, action);
      if (activeScope.current === scope) {
        queryClient.setQueryData<FoodItem[]>(inventoryKey, previous =>
          (previous ?? []).filter(item => item.id !== id),
        );
        setSelectedItem(prev => prev?.id === id ? null : prev);
      }
    } finally { mutations.current--; }
  };

  const openItem = (item: FoodItem) => {
    setSelectedItem(item);
    setCurrentScreen("item-detail");
  };

  const openRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentScreen("recipes");
  };

  const isRecipeSaved = useCallback((recipe: Recipe) => {
    const key = recipeSaveKey(recipe);
    return savedScope === scope && savedRecipes.some((saved) => recipeSaveKey(saved) === key);
  }, [savedRecipes, savedScope, scope]);

  const mutateSharedRecipes = async (recipes: Recipe[], remove = false) => {
    if (!session || !household) throw new Error('Choose a household first.');
    if (savingScope.current === scope) throw new Error('Please wait for the current recipe to finish saving.');
    savingScope.current = scope; savedRevision.current++;
    try {
      const access = await token();
      for (const recipe of recipes) {
        if (activeScope.current !== scope) return;
        await householdSavedRecipes(access, household.id, remove ? 'remove' : 'save', recipe);
      }
    } finally {
      if (savingScope.current === scope) savingScope.current = null;
      if (activeScope.current === scope) await refreshSavedRecipes();
    }
  };
  const toggleSavedRecipe = async (recipe: Recipe) => {
    const wasSaved = savedRecipesRef.current.some(saved => recipeSaveKey(saved) === recipeSaveKey(recipe));
    if (demo) {
      setSavedRecipes(wasSaved ? savedRecipes.filter(saved => recipeSaveKey(saved) !== recipeSaveKey(recipe)) : [recipe, ...savedRecipes]);
    } else await mutateSharedRecipes([recipe], wasSaved);
    return !wasSaved;
  };
  const shareLocalRecipes = async () => {
    if (!session || !household) throw new Error('Choose a household first.');
    const local = await loadSavedRecipes(session.user.id, household.id);
    if (activeScope.current !== scope) return;
    await mutateSharedRecipes(local);
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
        refreshInventory,
        inventoryLoading,
        inventoryError,
        recipes: dynamicRecipes,
        savedRecipes: savedScope === scope ? savedRecipes : [],
        savedRecipesError, refreshSavedRecipes, shareLocalRecipes,
        savedRecipesLoading,
        isRecipeSaved,
        toggleSavedRecipe,
        currentScreen,
        selectedItem,
        selectedRecipe,
        expiringSoonCount,
        user: accountUser,
        isAuthenticated,
        navigate: setCurrentScreen,
        addItem,
        updateItem,
        removeItem,
        transitionItem,
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
