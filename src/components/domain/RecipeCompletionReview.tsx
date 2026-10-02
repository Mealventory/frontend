import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../atoms/Button';
import type { Recipe } from '../../types';
import { inventoryRequest, type InventoryRow } from '../../lib/inventoryApi';
import { supabase } from '../../lib/supabase';
import { CompletionError, newCompletionId, reviewedDeductions, submitCompletion, suggestedInventory, type CompletionRecord } from '../../lib/recipeCompletion';
import { readCompletion, writeCompletion } from '../../lib/recipeCompletionStorage';
import { clearCookingSession } from '../../lib/cookingSession';

export function RecipeCompletionReview({ recipe, householdId, userId, onBack, onDone, refreshInventory }: {
  recipe: Recipe; householdId: string; userId: string; onBack: () => void; onDone: () => void; refreshInventory: () => Promise<void>;
}) {
  const scope = `${userId}:${householdId}:${recipe.id}`;
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [record, setRecord] = useState<CompletionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canReload, setCanReload] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  async function token() {
    const session = (await supabase?.auth.getSession())?.data.session;
    if (!session || session.user.id !== userId || !alive.current) throw new Error('Please sign in again.');
    return session.access_token;
  }
  async function load(reset = false) {
    setLoading(true); setError('');
    try {
      if (reset) await writeCompletion(scope, null);
      const stored = reset ? null : await readCompletion(scope);
      if (!alive.current) return;
      setRecord(stored); setAmounts({}); setCanReload(false);
      if (!stored) {
        const inventory = await inventoryRequest<InventoryRow[]>(await token(), householdId);
        if (alive.current) setRows(inventory);
      }
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Could not load the review.'); }
    finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setCanReload(false);
    try {
      let pending = record;
      if (!pending) {
        const items = reviewedDeductions(rows, amounts);
        if (!items.length) throw new Error('Enter the amount used for at least one item, or finish without changing the pantry.');
        pending = { request: { completion_id: newCompletionId(), recipe_id: recipe.id, recipe_name: recipe.name, items } };
        await writeCompletion(scope, pending);
        if (!alive.current) return;
        setRecord(pending);
      }
      const result = pending.result || await submitCompletion(await token(), householdId, pending.request);
      const completed = { ...pending, result };
      await writeCompletion(scope, completed);
      if (!alive.current) return;
      setRecord(completed);
      clearCookingSession(recipe.id);
      await refreshInventory();
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : 'Could not save the meal.');
        setCanReload(e instanceof CompletionError && e.canReviewAgain);
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  const suggestions = suggestedInventory(recipe.uses, rows);
  const visibleRows = showAll ? rows : suggestions;
  return <SafeAreaView className="flex-1 bg-ground-canvas">
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text className="text-[26px] font-bold text-text-primary mb-2">{record?.result ? 'Meal recorded' : 'What did you use?'}</Text>
      <Text className="text-[16px] text-text-secondary mb-4">{recipe.name}</Text>
      {loading ? <ActivityIndicator color="#10B981" /> : record?.result ? <View className="gap-4">
        <Text className="text-text-primary">Your pantry has been updated. Finished items are in consumed history.</Text>
        {record.result.items.map(item => <Text key={item.item_id} className="text-text-secondary">{item.name}: {item.used} {item.unit} used · {item.remaining} remaining</Text>)}
        <Button label="Done" onPress={onDone} />
        <Button label="I cooked this again — review a new meal" variant="outline" onPress={() => void load(true)} />
      </View> : record ? <View className="gap-4">
        <Text className="text-text-secondary">Your review is saved. Retry this same submission to confirm the update safely.</Text>
        <Button label="Retry pantry update" loading={busy} onPress={() => void save()} />
        {canReload && <Button label="Reload pantry and review again" variant="outline" disabled={busy} onPress={() => void load(true)} />}
      </View> : <View className="gap-4">
        <Text className="text-text-secondary">Ingredients: {recipe.uses.join(', ')}</Text>
        <Text className="text-text-secondary">Enter what you used in each pantry item's unit. Leave an amount blank to skip it. Recipe amounts are not assumed or converted.</Text>
        {!visibleRows.length && <Text className="text-text-muted">No exact pantry matches. Choose from all pantry items or finish without updating.</Text>}
        {visibleRows.map(row => <View key={row.id} className="p-4 rounded-2xl bg-ground-card border border-border-default gap-2">
          <Text className="text-[17px] font-bold text-text-primary">{row.name}</Text>
          <Text className="text-text-secondary">{row.quantity} {row.unit} available · {row.storage_zone || 'Pantry'}{row.expiry_date ? ` · ${row.expiry_date}` : ''}</Text>
          <Text className="text-text-secondary">Amount used ({row.unit})</Text>
          <TextInput accessibilityLabel={`Amount of ${row.name} used in ${row.unit}`} keyboardType="decimal-pad" editable={!busy}
            placeholder="Leave blank to skip" placeholderTextColor="#94A3B8" value={amounts[row.id] || ''}
            onChangeText={value => setAmounts(previous => ({ ...previous, [row.id]: value }))}
            className="min-h-[48px] px-3 py-3 rounded-xl bg-ground-input border border-border-default text-text-primary" />
          {Number(amounts[row.id]) > 0 && Number(amounts[row.id]) <= Number(row.quantity) && <Text className="text-brand-500">{Number(amounts[row.id]) === Number(row.quantity) ? 'Moves to consumed history' : `${Number((Number(row.quantity) - Number(amounts[row.id])).toFixed(3))} ${row.unit} will remain`}</Text>}
        </View>)}
        {!showAll && <Button label="Choose from all pantry items" variant="outline" onPress={() => setShowAll(true)} disabled={busy} />}
        <Button label="Confirm amounts & update pantry" loading={busy} disabled={!Object.values(amounts).some(value => value.trim())} onPress={() => void save()} />
        <Button label="Finish without changing pantry" variant="ghost" disabled={busy} onPress={() => { clearCookingSession(recipe.id); onDone(); }} />
      </View>}
      {!!error && <Text accessibilityRole="alert" className="text-urgency-critical mt-4">{error}</Text>}
      {!!error && !record && <Button label="Reload review" variant="outline" disabled={busy || loading} onPress={() => void load()} />}
      {!record?.result && <Button label="Back to cooking" variant="ghost" disabled={busy || loading} onPress={onBack} className="mt-3" />}
    </ScrollView>
  </SafeAreaView>;
}
