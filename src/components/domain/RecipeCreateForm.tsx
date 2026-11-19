import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Button, Input, Typography, Icon } from "@/src/components/atoms";
import type { Recipe } from "@/src/types";

interface RecipeCreateFormProps {
  initialRecipe?: Recipe;
  onCancel: () => void;
  onSave: (recipe: Recipe) => Promise<void>;
  onSaved: () => void;
}

export function RecipeCreateForm({ initialRecipe, onCancel, onSave, onSaved }: RecipeCreateFormProps) {
  const editing = Boolean(initialRecipe);
  const [name, setName] = useState(() => initialRecipe?.name ?? "");
  const [description, setDescription] = useState(() => initialRecipe?.description ?? "");
  const [time, setTime] = useState(() => initialRecipe?.time ?? "30 min");
  const [difficulty, setDifficulty] = useState<Recipe["difficulty"]>(() => initialRecipe?.difficulty ?? "Medium");
  const [tag, setTag] = useState(() => initialRecipe?.tag ?? "Custom");
  const [ingredients, setIngredients] = useState(() => initialRecipe?.uses ?? [""]);
  const [steps, setSteps] = useState(() => initialRecipe?.steps ?? [""]);
  const [errors, setErrors] = useState<{ name?: string; ingredients?: string; steps?: string }>({});
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);

  const updateRow = (rows: string[], setRows: (rows: string[]) => void, index: number, value: string) => {
    setRows(rows.map((row, rowIndex) => rowIndex === index ? value : row));
  };
  const moveStep = (index: number, offset: number) => {
    const destination = index + offset;
    if (destination < 0 || destination >= steps.length) return;
    const reordered = [...steps];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    setSteps(reordered);
  };

  const submit = async () => {
    const cleanName = name.trim();
    const cleanIngredients = ingredients.map(value => value.trim()).filter(Boolean);
    const cleanSteps = steps.map(value => value.trim()).filter(Boolean);
    const nextErrors = {
      ...(!cleanName ? { name: "Enter a recipe name." } : {}),
      ...(!cleanIngredients.length ? { ingredients: "Add at least one required ingredient." } : {}),
      ...(!cleanSteps.length ? { steps: "Add at least one cooking step." } : {}),
    };
    setErrors(nextErrors);
    setSaveError("");
    if (Object.keys(nextErrors).length) return;

    const recipe: Recipe = {
      ...initialRecipe,
      id: initialRecipe?.id ?? `custom-${Date.now()}`,
      origin: "custom",
      name: cleanName,
      description: description.trim(),
      uses: cleanIngredients,
      steps: cleanSteps,
      time: time.trim() || "30 min",
      difficulty,
      match: initialRecipe?.match ?? 0,
      emoji: initialRecipe?.emoji ?? "🍽️",
      tag: tag.trim() || "Custom",
    };
    setBusy(true);
    try {
      await onSave(recipe);
      onSaved();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save this recipe. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const removeRow = (rows: string[], setRows: (rows: string[]) => void, index: number) => {
    setRows(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel={editing ? "Cancel editing recipe" : "Cancel creating recipe"} onPress={onCancel} className="w-11 h-11 rounded-[14px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center border border-border-default">
          <Icon name="ArrowLeft" size={18} />
        </Pressable>
        <View className="flex-1">
          <Typography variant="h2">{editing ? "Edit recipe" : "Create recipe"}</Typography>
          <Typography variant="caption" color="muted">{editing ? "Changes are shared with your household." : "Save a recipe for everyone in your household."}</Typography>
        </View>
      </View>

      <Input label="Recipe name *" accessibilityLabel="Recipe name" value={name} onChangeText={setName} placeholder="e.g. Sunday tomato soup" maxLength={300} error={errors.name} editable={!busy} />
      <Input label="Description" accessibilityLabel="Recipe description" value={description} onChangeText={setDescription} placeholder="A short note about this recipe (optional)" multiline numberOfLines={3} textAlignVertical="top" style={{ minHeight: 92 }} maxLength={10000} editable={!busy} />

      <View className="gap-4">
        <Input label="Preparation time" accessibilityLabel="Preparation time" value={time} onChangeText={setTime} placeholder="e.g. 45 min" maxLength={100} editable={!busy} />
        <View className="gap-2">
          <Typography variant="caption" className="font-semibold text-text-secondary uppercase tracking-wider ml-1">Difficulty</Typography>
          <View className="flex-row gap-2">
            {(["Easy", "Medium", "Hard"] as const).map(option => {
              const selected = difficulty === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled: busy }}
                  accessibilityLabel={`${option} difficulty`}
                  onPress={() => setDifficulty(option)}
                  disabled={busy}
                  className={`flex-1 min-h-[44px] rounded-xl border items-center justify-center ${selected ? "bg-brand-50 dark:bg-brand-500/20 border-brand-500" : "bg-ground-surface dark:bg-ground-card border-border-default"}`}
                >
                  <Text className={`font-semibold ${selected ? "text-brand-500" : "text-text-secondary"}`}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Input label="Tag" accessibilityLabel="Recipe tag" value={tag} onChangeText={setTag} placeholder="e.g. Dinner" maxLength={100} editable={!busy} />
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Typography variant="h3">Required ingredients *</Typography>
          <Pressable accessibilityRole="button" accessibilityLabel="Add ingredient" onPress={() => setIngredients([...ingredients, ""])} disabled={busy} className="flex-row items-center gap-1 px-2 py-2">
            <Icon name="Plus" size={16} color="#10B981" /><Text className="text-brand-500 font-bold">Add</Text>
          </Pressable>
        </View>
        {ingredients.map((ingredient, index) => (
          <View key={`ingredient-${index}`} className="flex-row items-start gap-2">
            <View className="flex-1"><Input accessibilityLabel={`Ingredient ${index + 1}`} value={ingredient} onChangeText={value => updateRow(ingredients, setIngredients, index, value)} placeholder={`Ingredient ${index + 1}`} maxLength={300} editable={!busy} /></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ingredient ${index + 1}`} onPress={() => removeRow(ingredients, setIngredients, index)} disabled={busy} className="w-11 h-[52px] items-center justify-center">
              <Icon name="X" size={17} color="#64748B" />
            </Pressable>
          </View>
        ))}
        {!!errors.ingredients && <Text accessibilityRole="alert" className="text-[12px] font-medium text-urgency-critical">{errors.ingredients}</Text>}
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Typography variant="h3">Cooking steps *</Typography>
          <Pressable accessibilityRole="button" accessibilityLabel="Add cooking step" onPress={() => setSteps([...steps, ""])} disabled={busy} className="flex-row items-center gap-1 px-2 py-2">
            <Icon name="Plus" size={16} color="#10B981" /><Text className="text-brand-500 font-bold">Add</Text>
          </Pressable>
        </View>
        {steps.map((step, index) => (
          <View key={`step-${index}`} className="flex-row items-start gap-2">
            <View className="w-7 h-[52px] items-center justify-center"><Text className="text-brand-500 font-bold">{index + 1}</Text></View>
            <View className="flex-1"><Input accessibilityLabel={`Cooking step ${index + 1}`} value={step} onChangeText={value => updateRow(steps, setSteps, index, value)} placeholder={`Step ${index + 1}`} multiline maxLength={4000} editable={!busy} /></View>
            <View className="items-center">
              <Pressable accessibilityRole="button" accessibilityLabel={`Move step ${index + 1} up`} onPress={() => moveStep(index, -1)} disabled={busy || index === 0} className="w-10 h-8 items-center justify-center" style={{ opacity: index === 0 ? 0.35 : 1 }}>
                <Icon name="ChevronUp" size={17} color="#64748B" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Move step ${index + 1} down`} onPress={() => moveStep(index, 1)} disabled={busy || index === steps.length - 1} className="w-10 h-8 items-center justify-center" style={{ opacity: index === steps.length - 1 ? 0.35 : 1 }}>
                <Icon name="ChevronDown" size={17} color="#64748B" />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove step ${index + 1}`} onPress={() => removeRow(steps, setSteps, index)} disabled={busy} className="w-10 h-8 items-center justify-center">
                <Icon name="X" size={16} color="#64748B" />
              </Pressable>
            </View>
          </View>
        ))}
        {!!errors.steps && <Text accessibilityRole="alert" className="text-[12px] font-medium text-urgency-critical">{errors.steps}</Text>}
      </View>

      {!!saveError && <View accessibilityRole="alert" className="p-3 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30"><Typography variant="caption" className="text-urgency-critical">{saveError}</Typography></View>}
      <View className="gap-2 mb-4">
        <Button label={busy ? (editing ? "Saving changes…" : "Saving recipe…") : (editing ? "Save changes" : "Save to household recipes")} loading={busy} disabled={busy} onPress={() => void submit()} />
        <Button label="Cancel" variant="ghost" disabled={busy} onPress={onCancel} />
      </View>
    </View>
  );
}
