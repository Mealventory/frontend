import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Button, Icon, Typography } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useAuth } from "@/src/context/AuthContext";
import { useInventory } from "@/src/context/InventoryContext";
import {
  addMissingIngredientsToShopping,
  listShoppingItems,
  type ShoppingItem,
} from "@/src/lib/shoppingApi";
import {
  applyMealMove,
  isMealDateWithinWarningWindow,
  loadMealPlan,
  localDateKey,
  mealIngredientReadiness,
  mealMatchPercent,
  mealSlotKey,
  mealsForWeek,
  movePlannedMeal,
  removePlannedMeal,
  savePlannedMeal,
  shiftWeek,
  startOfWeek,
  upcomingMealReadinessWarnings,
  weeklyMissingIngredients,
  weekDates,
  type MealSlot,
  type PlannedMeal,
} from "@/src/lib/mealPlan";
import { recipeSaveKey } from "@/src/lib/savedRecipes";
import type { Recipe } from "@/src/types";

type SlotTarget = { date: string; slot: MealSlot };

function uniqueRecipes(recipes: Array<Recipe | null | undefined>): Recipe[] {
  const seen = new Set<string>();
  const result: Recipe[] = [];
  for (const recipe of recipes) {
    if (!recipe) continue;
    const key = recipeSaveKey(recipe);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(recipe);
  }
  return result;
}

function formatWeekRange(start: Date) {
  const days = weekDates(start);
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endText = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
  });
  return `${startText} – ${endText}`;
}

function formatDay(date: Date) {
  return {
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}

export default function MealPlanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const { session, household } = useAuth();
  const {
    inventory,
    savedRecipes,
    selectedRecipe,
    openRecipe,
  } = useInventory();

  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeek(new Date()));
  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<SlotTarget | null>(null);
  const [movingFrom, setMovingFrom] = useState<SlotTarget | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const scopeKey = `${session?.user.id || ""}:${household?.id || ""}`;

  const load = useCallback(async () => {
    if (!session || !household) {
      setMeals([]);
      setShoppingItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [loadedMeals, loadedShopping] = await Promise.all([
        loadMealPlan(session.user.id, household.id),
        listShoppingItems(session.access_token, household.id).catch(() => []),
      ]);
      setMeals(loadedMeals);
      setShoppingItems(loadedShopping);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the meal plan.");
    } finally {
      setLoading(false);
    }
  }, [household?.id, session?.access_token, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const visibleDates = useMemo(() => weekDates(weekStartDate), [weekStartDate]);
  const visibleMeals = useMemo(
    () => mealsForWeek(meals, weekStartDate),
    [meals, weekStartDate]
  );
  const mealBySlot = useMemo(
    () =>
      new Map(
        visibleMeals.map((meal) => [
          mealSlotKey(meal.date, meal.slot),
          meal,
        ])
      ),
    [visibleMeals]
  );

  const inventoryNames = useMemo(
    () =>
      new Set(
        inventory
          .filter((item) => !item.expiryDate || item.daysLeft >= 0)
          .map((item) => item.name.trim().toLocaleLowerCase())
      ),
    [inventory]
  );

  const shoppingNames = useMemo(
    () =>
      new Set(
        shoppingItems.map((item) => item.name.trim().toLocaleLowerCase())
      ),
    [shoppingItems]
  );

  const missingForWeek = useMemo(
    () => weeklyMissingIngredients(visibleMeals, inventoryNames),
    [visibleMeals, inventoryNames]
  );
  const unresolvedForWeek = useMemo(
    () =>
      missingForWeek.filter(
        (ingredient) => !shoppingNames.has(ingredient.toLocaleLowerCase())
      ),
    [missingForWeek, shoppingNames]
  );
  const shoppingCoveredForWeek = useMemo(
    () =>
      missingForWeek.filter((ingredient) =>
        shoppingNames.has(ingredient.toLocaleLowerCase())
      ),
    [missingForWeek, shoppingNames]
  );
  const upcomingWarnings = useMemo(
    () =>
      upcomingMealReadinessWarnings(
        meals,
        inventoryNames,
        shoppingNames
      ),
    [meals, inventoryNames, shoppingNames]
  );

  const requestedRecipe =
    params.recipeId && selectedRecipe?.id === params.recipeId
      ? selectedRecipe
      : null;
  const recipeChoices = useMemo(
    () => uniqueRecipes([requestedRecipe, selectedRecipe, ...savedRecipes]),
    [requestedRecipe, selectedRecipe, savedRecipes]
  );

  const chooseSlot = async (target: SlotTarget) => {
    if (!session || !household || busyKey) return;

    if (movingFrom) {
      const sourceKey = mealSlotKey(movingFrom.date, movingFrom.slot);
      const targetKey = mealSlotKey(target.date, target.slot);
      if (sourceKey === targetKey) {
        setMovingFrom(null);
        return;
      }
      setBusyKey(targetKey);
      setError("");
      setNotice("");
      const optimistic = applyMealMove(
        meals,
        movingFrom.date,
        movingFrom.slot,
        target.date,
        target.slot
      );
      setMeals(optimistic);
      try {
        const next = await movePlannedMeal(
          session.user.id,
          household.id,
          movingFrom.date,
          movingFrom.slot,
          target.date,
          target.slot
        );
        setMeals(next);
        setNotice(
          mealBySlot.has(targetKey)
            ? "Meals swapped successfully."
            : "Meal moved successfully."
        );
        setMovingFrom(null);
      } catch (e) {
        await load();
        setError(e instanceof Error ? e.message : "Could not move the meal.");
      } finally {
        setBusyKey(null);
      }
      return;
    }

    if (requestedRecipe) {
      await assignRecipe(target, requestedRecipe);
      return;
    }

    setPickerTarget(target);
  };

  const assignRecipe = async (target: SlotTarget, recipe: Recipe) => {
    if (!session || !household || busyKey) return;
    const key = mealSlotKey(target.date, target.slot);
    const meal: PlannedMeal = { ...target, recipe };
    setBusyKey(key);
    setError("");
    setNotice("");
    setMeals((current) => [
      ...current.filter(
        (item) => mealSlotKey(item.date, item.slot) !== key
      ),
      meal,
    ]);

    try {
      await savePlannedMeal(session.user.id, household.id, meal);
      setPickerTarget(null);
      setNotice(`${recipe.name} added to ${target.slot}.`);
    } catch (e) {
      await load();
      setError(e instanceof Error ? e.message : "Could not plan this meal.");
    } finally {
      setBusyKey(null);
    }
  };

  const removeMeal = async (meal: PlannedMeal) => {
    if (!session || !household || busyKey) return;
    const key = mealSlotKey(meal.date, meal.slot);
    setBusyKey(key);
    setError("");
    setNotice("");
    setMeals((current) =>
      current.filter((item) => mealSlotKey(item.date, item.slot) !== key)
    );
    try {
      await removePlannedMeal(
        session.user.id,
        household.id,
        meal.date,
        meal.slot
      );
      setMovingFrom((current) =>
        current &&
        current.date === meal.date &&
        current.slot === meal.slot
          ? null
          : current
      );
      setNotice("Meal removed from the plan.");
    } catch (e) {
      await load();
      setError(e instanceof Error ? e.message : "Could not remove the meal.");
    } finally {
      setBusyKey(null);
    }
  };

  const openMeal = (meal: PlannedMeal) => {
    openRecipe(meal.recipe);
    router.push({
      pathname: "/(app)/recipes/[id]",
      params: { id: meal.recipe.id },
    } as any);
  };

  const refreshShopping = async () => {
    if (!session || !household) return;
    try {
      const latest = await listShoppingItems(
        session.access_token,
        household.id
      );
      setShoppingItems(latest);
    } catch {
      // The add helper remains duplicate-safe even if this refresh fails.
    }
  };

  const addMealToShopping = async (meal: PlannedMeal) => {
    if (!session || !household || busyKey) return;
    const readiness = mealIngredientReadiness(
      meal.recipe,
      inventoryNames,
      shoppingNames
    );
    if (readiness.unresolvedIngredients.length === 0) return;

    const key = "shopping:" + mealSlotKey(meal.date, meal.slot);
    setBusyKey(key);
    setError("");
    setNotice("");
    try {
      const result = await addMissingIngredientsToShopping(
        session.access_token,
        household.id,
        readiness.unresolvedIngredients
      );
      await refreshShopping();
      const skipped =
        result.skipped > 0
          ? " " + result.skipped + " already " +
            (result.skipped === 1 ? "was" : "were") + " on the list."
          : "";
      setNotice(
        result.added > 0
          ? result.added + " ingredient" + (result.added === 1 ? "" : "s") +
            " for " + meal.recipe.name + " added to Shopping." + skipped
          : "The missing ingredients for " + meal.recipe.name +
            " are already on Shopping."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not add this meal's missing ingredients to Shopping."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const addWeekToShopping = async () => {
    if (!session || !household || unresolvedForWeek.length === 0 || busyKey) return;
    setBusyKey("shopping");
    setError("");
    setNotice("");
    try {
      const result = await addMissingIngredientsToShopping(
        session.access_token,
        household.id,
        unresolvedForWeek
      );
      await refreshShopping();
      const skipped =
        result.skipped > 0
          ? ` ${result.skipped} already ${result.skipped === 1 ? "was" : "were"} on the list.`
          : "";
      setNotice(
        result.added > 0
          ? `${result.added} missing ingredient${result.added === 1 ? "" : "s"} added to Shopping.${skipped}`
          : "All missing ingredients are already on your Shopping list."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not add weekly ingredients to Shopping."
      );
    } finally {
      setBusyKey(null);
    }
  };

  const currentWeekKey = localDateKey(startOfWeek(new Date()));
  const visibleWeekKey = localDateKey(weekStartDate);
  const todayKey = localDateKey(new Date());

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 mb-5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl border border-border-default bg-ground-surface items-center justify-center"
          >
            <Icon name="ArrowLeft" size={19} />
          </TouchableOpacity>
          <View className="flex-1">
            <Typography variant="h1">Meal Plan</Typography>
            <Typography variant="caption" color="muted">
              Lunch and dinner for the week
            </Typography>
          </View>
        </View>

        <View className="p-4 rounded-[22px] bg-ground-card border border-border-default mb-5">
          <View className="flex-row items-center justify-between gap-3 mb-3">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous week"
              onPress={() => {
                setWeekStartDate((current) => shiftWeek(current, -1));
                setPickerTarget(null);
                setMovingFrom(null);
              }}
              className="w-10 h-10 rounded-xl border border-border-default items-center justify-center"
            >
              <Icon name="ChevronLeft" size={18} />
            </TouchableOpacity>
            <View className="flex-1 items-center">
              <Typography variant="body" className="font-bold">
                {formatWeekRange(weekStartDate)}
              </Typography>
              <Typography variant="caption" color="muted">
                {visibleWeekKey === currentWeekKey ? "This week" : "Weekly plan"}
              </Typography>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next week"
              onPress={() => {
                setWeekStartDate((current) => shiftWeek(current, 1));
                setPickerTarget(null);
                setMovingFrom(null);
              }}
              className="w-10 h-10 rounded-xl border border-border-default items-center justify-center"
            >
              <Icon name="ChevronRight" size={18} />
            </TouchableOpacity>
          </View>
          {visibleWeekKey !== currentWeekKey && (
            <Button
              label="Back to This Week"
              variant="ghost"
              size="sm"
              onPress={() => {
                setWeekStartDate(startOfWeek(new Date()));
                setPickerTarget(null);
                setMovingFrom(null);
              }}
            />
          )}
        </View>

        {!!requestedRecipe && (
          <View className="mb-5 p-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-500/20">
            <View className="flex-row items-center gap-3">
              <Text className="text-[28px]">{requestedRecipe.emoji}</Text>
              <View className="flex-1">
                <Typography variant="body" className="font-bold">
                  Planning {requestedRecipe.name}
                </Typography>
                <Typography variant="caption" color="muted">
                  Tap any Lunch or Dinner slot below to schedule it.
                </Typography>
              </View>
            </View>
          </View>
        )}

        {!!movingFrom && (
          <View className="mb-5 p-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-500/20">
            <Typography variant="body" className="font-bold">
              Meal picked up
            </Typography>
            <Typography variant="caption" color="muted" className="mt-1">
              Tap another slot to move it there. If that slot already has a meal,
              the two meals will swap places.
            </Typography>
            <Button
              label="Cancel Move"
              variant="ghost"
              size="sm"
              className="mt-2"
              onPress={() => setMovingFrom(null)}
            />
          </View>
        )}

        {!!error && (
          <View
            accessibilityRole="alert"
            className="mb-4 p-3.5 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30"
          >
            <Typography variant="caption" className="text-urgency-critical">
              {error}
            </Typography>
          </View>
        )}

        {!!notice && (
          <View
            accessibilityLiveRegion="polite"
            className="mb-4 p-3.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-500/25"
          >
            <Typography variant="caption" className="text-brand-700 dark:text-brand-300">
              {notice}
            </Typography>
          </View>
        )}

        {!loading && upcomingWarnings.length > 0 && (
          <View
            accessibilityRole="alert"
            className="mb-5 p-4 rounded-2xl bg-urgency-soon-bg border border-urgency-soon/40"
          >
            <View className="flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-xl bg-ground-surface items-center justify-center">
                <Icon name="AlertTriangle" size={19} color="#F59E0B" />
              </View>
              <View className="flex-1">
                <Typography variant="body" className="font-bold">
                  Upcoming meals need shopping
                </Typography>
                <Typography variant="caption" color="muted" className="mt-1">
                  {upcomingWarnings.length} planned {upcomingWarnings.length === 1 ? "meal has" : "meals have"} unresolved ingredients in the next 2 days.
                </Typography>
              </View>
            </View>
            <Text className="text-[12px] text-text-secondary leading-5 mt-3">
              {upcomingWarnings
                .map(({ meal, readiness }) => {
                  const day = parseLocalDateKey(meal.date).toLocaleDateString(
                    undefined,
                    { weekday: "short" }
                  );
                  return day + " " + meal.slot + ": " +
                    readiness.unresolvedIngredients.join(", ");
                })
                .join(" · ")}
            </Text>
            <Typography variant="caption" color="muted" className="mt-2">
              Meal times are not stored yet, so this reminder stays in-app instead of guessing a notification time.
            </Typography>
            <Button
              label="Open Shopping"
              variant="outline"
              size="sm"
              className="mt-3"
              onPress={() => router.push("/(app)/(tabs)/shopping" as any)}
            />
          </View>
        )}

        {loading ? (
          <View className="py-16 items-center gap-3">
            <ActivityIndicator size="large" color="#10B981" />
            <Typography variant="caption" color="muted">
              Loading your meal plan…
            </Typography>
          </View>
        ) : (
          <View className="gap-3">
            {visibleDates.map((date) => {
              const dateKey = localDateKey(date);
              const label = formatDay(date);
              const isToday = dateKey === todayKey;
              return (
                <View
                  key={dateKey}
                  className="p-4 rounded-[22px] bg-ground-card border border-border-default"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                      <Typography variant="body" className="font-bold">{label.weekday}</Typography>
                      {isToday && (
                        <View className="px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/15">
                          <Text className="text-[10px] font-bold text-brand-500">
                            TODAY
                          </Text>
                        </View>
                      )}
                    </View>
                    <Typography variant="caption" color="muted">
                      {label.date}
                    </Typography>
                  </View>

                  <View className="gap-2">
                    {(["lunch", "dinner"] as MealSlot[]).map((slot) => {
                      const key = mealSlotKey(dateKey, slot);
                      const meal = mealBySlot.get(key);
                      const isSource =
                        movingFrom?.date === dateKey &&
                        movingFrom?.slot === slot;

                      if (!meal) {
                        return (
                          <Pressable
                            key={slot}
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${slot} for ${label.weekday} ${label.date}`}
                            disabled={Boolean(busyKey)}
                            onPress={() => void chooseSlot({ date: dateKey, slot })}
                            className={`min-h-[58px] px-4 rounded-2xl border border-dashed items-center flex-row gap-3 ${
                              movingFrom || requestedRecipe
                                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                                : "border-border-default bg-ground-surface"
                            }`}
                          >
                            <View className="w-9 h-9 rounded-xl bg-ground-subtle items-center justify-center">
                              <Icon
                                name={movingFrom ? "Move" : "Plus"}
                                size={17}
                                color={movingFrom ? "#10B981" : "#64748B"}
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="text-[13px] font-bold text-text-primary capitalize">
                                {slot}
                              </Text>
                              <Text className="text-[12px] text-text-muted">
                                {movingFrom
                                  ? "Move meal here"
                                  : requestedRecipe
                                    ? "Schedule here"
                                    : "Add a recipe"}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      }

                      const readiness = mealIngredientReadiness(
                        meal.recipe,
                        inventoryNames,
                        shoppingNames
                      );
                      const match = readiness.matchPercent;
                      const isUpcomingWarning =
                        readiness.unresolvedIngredients.length > 0 &&
                        isMealDateWithinWarningWindow(dateKey);
                      const shoppingBusyKey = "shopping:" + key;

                      return (
                        <Pressable
                          key={slot}
                          accessibilityRole="button"
                          accessibilityLabel={slot + ": " + meal.recipe.name + ", " + match + "% ingredients available, " + readiness.unresolvedIngredients.length + " still need shopping"}
                          disabled={Boolean(busyKey)}
                          onLongPress={() =>
                            setMovingFrom({ date: dateKey, slot })
                          }
                          onPress={() =>
                            movingFrom
                              ? void chooseSlot({ date: dateKey, slot })
                              : openMeal(meal)
                          }
                          className={`p-3.5 rounded-2xl border ${
                            isSource
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                              : movingFrom
                                ? "border-brand-500/40 bg-ground-surface"
                                : isUpcomingWarning
                                  ? "border-urgency-soon/50 bg-urgency-soon-bg"
                                  : "border-border-default bg-ground-surface"
                          }`}
                          style={{ opacity: busyKey === key ? 0.55 : 1 }}
                        >
                          <View className="flex-row items-start gap-3">
                            <Text className="text-[30px]">{meal.recipe.emoji}</Text>
                            <View className="flex-1">
                              <View className="flex-row items-center gap-2 mb-1">
                                <Text className="text-[11px] font-bold text-text-subtle uppercase tracking-wider">
                                  {slot}
                                </Text>
                                <View
                                  className={
                                    "px-2 py-0.5 rounded-full " +
                                    (readiness.status === "ready"
                                      ? "bg-urgency-fresh-bg"
                                      : readiness.status === "low"
                                        ? "bg-urgency-soon-bg"
                                        : "bg-urgency-critical-bg")
                                  }
                                >
                                  <Text
                                    className={
                                      "text-[10px] font-bold " +
                                      (readiness.status === "ready"
                                        ? "text-urgency-fresh"
                                        : readiness.status === "low"
                                          ? "text-urgency-soon"
                                          : "text-urgency-critical")
                                    }
                                  >
                                    {readiness.status === "ready"
                                      ? "Ready"
                                      : readiness.status === "low"
                                        ? "Low readiness · " + match + "%"
                                        : "Missing ingredients"}
                                  </Text>
                                </View>
                              </View>
                              <Text className="text-[15px] font-bold text-text-primary">
                                {meal.recipe.name}
                              </Text>
                              <Text className="text-[12px] text-text-muted mt-0.5">
                                {meal.recipe.time} · {meal.recipe.tag}
                              </Text>
                              {readiness.status === "ready" ? (
                                <Text className="text-[12px] text-urgency-fresh mt-2">
                                  All listed ingredients are in your pantry.
                                </Text>
                              ) : (
                                <>
                                  <Text className="text-[12px] text-text-secondary mt-2 leading-5">
                                    Missing from pantry: {readiness.missingIngredients.join(", ")}
                                  </Text>
                                  {readiness.shoppingCoveredIngredients.length > 0 && (
                                    <Text className="text-[12px] text-brand-500 mt-1 leading-5">
                                      On Shopping: {readiness.shoppingCoveredIngredients.join(", ")}
                                    </Text>
                                  )}
                                  {isUpcomingWarning && (
                                    <View className="flex-row items-center gap-1.5 mt-2">
                                      <Icon name="AlertTriangle" size={14} color="#F59E0B" />
                                      <Text className="text-[12px] font-bold text-urgency-soon">
                                        Needs shopping soon
                                      </Text>
                                    </View>
                                  )}
                                </>
                              )}
                            </View>
                          </View>

                          {!movingFrom && (
                            <View className="gap-2 mt-3 pt-3 border-t border-border-default">
                              {readiness.unresolvedIngredients.length > 0 && (
                                <Button
                                  label="Add Missing to Shopping"
                                  variant="secondary"
                                  size="sm"
                                  loading={busyKey === shoppingBusyKey}
                                  disabled={Boolean(busyKey) && busyKey !== shoppingBusyKey}
                                  leadingIcon={<Icon name="ShoppingBasket" size={14} />}
                                  onPress={() => void addMealToShopping(meal)}
                                />
                              )}
                              <View className="flex-row gap-2">
                                <Button
                                  label="Move"
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1"
                                  leadingIcon={<Icon name="Move" size={14} />}
                                  onPress={() =>
                                    setMovingFrom({ date: dateKey, slot })
                                  }
                                />
                                <Button
                                  label="Remove"
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1"
                                  leadingIcon={<Icon name="Trash2" size={14} />}
                                  onPress={() => void removeMeal(meal)}
                                />
                              </View>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {!loading && visibleMeals.length === 0 && !pickerTarget && !movingFrom && !requestedRecipe && (
          <View className="mt-5">
            <EmptyState
              icon="CalendarDays"
              title="Nothing planned this week"
              description="Save a recipe you like, then schedule it for lunch or dinner."
              actionLabel="Browse Recipes"
              onAction={() => router.push("/(app)/(tabs)/recipes" as any)}
            />
          </View>
        )}

        {!!pickerTarget && (
          <View className="mt-5 p-4 rounded-[22px] bg-ground-card border border-border-default">
            <View className="flex-row items-start justify-between gap-3 mb-3">
              <View className="flex-1">
                <Typography variant="body" className="font-bold">Choose a recipe</Typography>
                <Typography variant="caption" color="muted">
                  {pickerTarget.slot === "lunch" ? "Lunch" : "Dinner"} ·{" "}
                  {parseLocalDateKey(pickerTarget.date).toLocaleDateString(
                    undefined,
                    { weekday: "long", month: "short", day: "numeric" }
                  )}
                </Typography>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close recipe picker"
                onPress={() => setPickerTarget(null)}
                className="w-9 h-9 rounded-xl border border-border-default items-center justify-center"
              >
                <Icon name="X" size={16} />
              </TouchableOpacity>
            </View>

            {recipeChoices.length === 0 ? (
              <EmptyState
                icon="BookOpen"
                title="Save a recipe first"
                description="Saved recipes appear here so you can schedule them for the week."
                actionLabel="Browse Recipes"
                onAction={() => router.push("/(app)/(tabs)/recipes" as any)}
              />
            ) : (
              <View className="gap-2">
                {recipeChoices.map((recipe) => {
                  const match = mealMatchPercent(recipe, inventoryNames);
                  return (
                    <TouchableOpacity
                      key={recipeSaveKey(recipe)}
                      accessibilityRole="button"
                      accessibilityLabel={`Plan ${recipe.name}`}
                      disabled={Boolean(busyKey)}
                      onPress={() => void assignRecipe(pickerTarget, recipe)}
                      className="min-h-[64px] p-3 rounded-2xl border border-border-default bg-ground-surface flex-row items-center gap-3"
                    >
                      <Text className="text-[28px]">{recipe.emoji}</Text>
                      <View className="flex-1">
                        <Text className="text-[14px] font-bold text-text-primary">
                          {recipe.name}
                        </Text>
                        <Text className="text-[12px] text-text-muted mt-0.5">
                          {recipe.time} · {match}% ingredients ready
                        </Text>
                      </View>
                      <Icon name="Plus" size={17} color="#10B981" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {visibleMeals.length > 0 && (
          <View className="mt-5 p-4 rounded-[22px] bg-ground-card border border-border-default">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 items-center justify-center">
                <Icon name="ShoppingBasket" size={18} color="#10B981" />
              </View>
              <View className="flex-1">
                <Typography variant="body" className="font-bold">
                  Weekly ingredients
                </Typography>
                <Typography variant="caption" color="muted">
                  {missingForWeek.length
                    ? `${missingForWeek.length} missing across this week's meals`
                    : "You have every listed ingredient"}
                </Typography>
              </View>
            </View>

            {missingForWeek.length > 0 && (
              <>
                <Text className="text-[12px] text-text-muted leading-5 mb-3">
                  {missingForWeek.join(", ")}
                </Text>
                <Button
                  label="Add Missing Week to Shopping"
                  loading={busyKey === "shopping"}
                  disabled={Boolean(busyKey) && busyKey !== "shopping"}
                  onPress={() => void addWeekToShopping()}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function parseLocalDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}
