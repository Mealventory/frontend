import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../atoms/Button';
import { Checkbox } from '../atoms/Checkbox';
import { FormField } from '../molecules/FormField';
import { TagChipGroup } from '../molecules/TagChipGroup';
import { ExpiryDateField } from '../molecules/ExpiryDateField';
import type { Recipe, StorageZone } from '../../types';
import { batchCreateInventoryItems, inventoryRequest, type InventoryRow } from '../../lib/inventoryApi';
import { supabase } from '../../lib/supabase';
import { CompletionError, createLeftoverInventoryItem, leftoverIdempotencyKey, newCompletionId, reviewedDeductions, submitCompletion, suggestedInventory, type CompletionRecord } from '../../lib/recipeCompletion';
import { readCompletion, writeCompletion } from '../../lib/recipeCompletionStorage';
import { clearCookingSession } from '../../lib/cookingSession';
import { normalizeExpiryDate } from '../../lib/expiryDate';

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
  const [completionId, setCompletionId] = useState(() => newCompletionId());
  const [servingsMade, setServingsMade] = useState(String(
    Number.isInteger(recipe.servings) && Number(recipe.servings) > 0 ? recipe.servings : 1
  ));
  const [showLeftoverForm, setShowLeftoverForm] = useState(false);
  const [leftoverName, setLeftoverName] = useState(recipe.name);
  const [leftoverPortions, setLeftoverPortions] = useState(servingsMade);
  const [leftoverZone, setLeftoverZone] = useState<StorageZone>('fridge');
  const [leftoverDate, setLeftoverDate] = useState('');
  const [dateConfirmed, setDateConfirmed] = useState(false);
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
      setRecord(stored); setCompletionId(stored?.request.completion_id || newCompletionId());
      setAmounts({}); setCanReload(false); setShowLeftoverForm(false);
      setServingsMade(String(stored?.servings_made ?? (Number.isInteger(recipe.servings) && Number(recipe.servings) > 0 ? recipe.servings : 1)));
      setLeftoverName(recipe.name);
      setLeftoverPortions(String(stored?.servings_made ?? (Number.isInteger(recipe.servings) && Number(recipe.servings) > 0 ? recipe.servings : 1)));
      setLeftoverZone('fridge'); setLeftoverDate(''); setDateConfirmed(false);
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
        const servings = Number(servingsMade.trim());
        if (!/^\d+$/.test(servingsMade.trim()) || servings < 1 || servings > 1000) {
          throw new Error('Enter a whole number of servings made, from 1 to 1000.');
        }
        const items = reviewedDeductions(rows, amounts);
        if (!items.length) throw new Error('Enter the amount used for at least one item, or finish without changing the pantry.');
        pending = { request: { completion_id: newCompletionId(), recipe_id: recipe.id, recipe_name: recipe.name, items }, servings_made: servings };
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

  async function finishWithoutPantryUpdate() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const servings = Number(servingsMade.trim());
      if (!/^\d+$/.test(servingsMade.trim()) || servings < 1 || servings > 1000) {
        throw new Error('Enter a whole number of servings made, from 1 to 1000.');
      }
      const finished: CompletionRecord = {
        request: {
          completion_id: completionId,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          items: [],
        },
        servings_made: servings,
        pantryUpdateSkipped: true,
      };
      await writeCompletion(scope, finished);
      if (!alive.current) return;
      setRecord(finished); setLeftoverPortions(String(servings));
      clearCookingSession(recipe.id);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not save this meal review.');
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  async function saveLeftovers() {
    if (lock.current || !record) return;
    lock.current = true; setBusy(true); setError('');
    try {
      let pending = record.leftover?.status === 'pending' ? record : null;
      if (!pending) {
        let normalizedDate: string | null;
        try { normalizedDate = normalizeExpiryDate(leftoverDate); }
        catch (e) { throw new Error((e as Error).message); }
        if (!dateConfirmed) {
          throw new Error(normalizedDate
            ? 'Confirm that this use-by or quality date is correct before saving.'
            : 'Confirm that the date is unknown and should be left unset.');
        }
        const item = createLeftoverInventoryItem(leftoverName, leftoverPortions, leftoverZone, normalizedDate);
        pending = { ...record, leftover: { status: 'pending', item } };
        // Persist the immutable payload before sending it. A timeout can then
        // safely retry the same operation key and body after reopening.
        await writeCompletion(scope, pending);
        if (!alive.current) return;
        setRecord(pending);
      }

      await batchCreateInventoryItems(
        await token(), householdId, [pending.leftover!.item],
        leftoverIdempotencyKey(pending.request.completion_id),
      );
      const saved: CompletionRecord = { ...pending, leftover: { ...pending.leftover!, status: 'saved' } };
      await writeCompletion(scope, saved);
      if (!alive.current) return;
      setRecord(saved); setShowLeftoverForm(false);
      await refreshInventory().catch(() => {});
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not save leftovers. Retry to check whether they were added.');
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  const suggestions = suggestedInventory(recipe.uses, rows);
  const visibleRows = showAll ? rows : suggestions;
  return <SafeAreaView className="flex-1 bg-ground-canvas">
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text className="text-[26px] font-bold text-text-primary mb-2">{record?.leftover?.status === 'saved' ? 'Leftovers saved' : record?.result ? 'Meal recorded' : record?.pantryUpdateSkipped ? 'Meal finished' : 'What did you use?'}</Text>
      <Text className="text-[16px] text-text-secondary mb-4">{recipe.name}</Text>
      {loading ? <ActivityIndicator color="#10B981" /> : record?.leftover?.status === 'saved' ? <View className="gap-4">
        <Text className="text-text-primary">Leftovers saved to your {record.leftover.item.storage_zone}.</Text>
        <Text className="text-text-secondary">{record.leftover.item.name} · {record.leftover.item.quantity} portions{record.leftover.item.expiry_date ? ` · Use by ${record.leftover.item.expiry_date}` : ' · No date set'}</Text>
        <Button label="Done" onPress={onDone} />
        <Button label="I cooked this again — review a new meal" variant="outline" onPress={() => void load(true)} />
      </View> : record?.leftover?.status === 'pending' ? <View className="gap-4">
        <Text className="text-text-primary">A leftover save may have reached your pantry. Retry the same save to safely check its status.</Text>
        <Text className="text-text-secondary">{record.leftover.item.name} · {record.leftover.item.quantity} portions · {record.leftover.item.storage_zone}{record.leftover.item.expiry_date ? ` · ${record.leftover.item.expiry_date}` : ' · No date set'}</Text>
        <Button label="Retry Save Leftovers" loading={busy} onPress={() => void saveLeftovers()} />
        <Button label="Done for now" variant="ghost" disabled={busy} onPress={onDone} />
      </View> : record?.result || record?.pantryUpdateSkipped ? <View className="gap-4">
        <Text className="text-text-primary">{record.result ? 'Your pantry has been updated. Finished items are in consumed history.' : 'Meal finished. Your pantry was left unchanged.'}</Text>
        {record.result?.items.map(item => <Text key={item.item_id} className="text-text-secondary">{item.name}: {item.used} {item.unit} used · {item.remaining} remaining</Text>)}
        {showLeftoverForm ? <View className="gap-4 rounded-2xl border border-border-default bg-ground-card p-4">
          <Text className="text-[18px] font-bold text-text-primary">Save leftovers</Text>
          <Text className="text-text-secondary">Add the prepared meal as a new pantry item. Ingredient amounts already used will stay consumed.</Text>
          <FormField label="Leftover name" value={leftoverName} editable={!busy} onChangeText={setLeftoverName} required />
          <FormField label="Portions to save" value={leftoverPortions} editable={!busy} keyboardType="decimal-pad" onChangeText={setLeftoverPortions} helperText="Prefilled from servings prepared; adjust to the portions you actually have." />
          <View>
            <Text className="text-text-secondary mb-2">Storage zone</Text>
            <TagChipGroup tags={['fridge', 'freezer']} selectedTag={leftoverZone} onSelectTag={zone => setLeftoverZone(zone as StorageZone)} />
          </View>
          <Text className="text-text-secondary">Only add a date you have confirmed. Leave it unset if you do not know the use-by or quality date.</Text>
          <ExpiryDateField value={leftoverDate} onChangeText={value => { setLeftoverDate(value); setDateConfirmed(false); }} editable={!busy} />
          <Checkbox checked={dateConfirmed} onToggle={setDateConfirmed} disabled={busy}
            label={leftoverDate.trim() ? 'I confirmed this use-by / quality date' : 'I do not know the date; leave it unset'} />
          <Button label="Save Leftovers" loading={busy} disabled={!dateConfirmed} onPress={() => void saveLeftovers()} />
          <Button label="Skip saving leftovers" variant="ghost" disabled={busy} onPress={() => setShowLeftoverForm(false)} />
        </View> : <Button label="Save Leftovers" variant="secondary" onPress={() => { setError(''); setLeftoverPortions(String(record.servings_made ?? servingsMade)); setShowLeftoverForm(true); }} />}
        <Button label="Done" variant="outline" onPress={onDone} />
        <Button label="I cooked this again — review a new meal" variant="ghost" onPress={() => void load(true)} />
      </View> : record ? <View className="gap-4">
        <Text className="text-text-secondary">Your review is saved. Retry this same submission to confirm the update safely.</Text>
        <Button label="Retry pantry update" loading={busy} onPress={() => void save()} />
        {canReload && <Button label="Reload pantry and review again" variant="outline" disabled={busy} onPress={() => void load(true)} />}
      </View> : <View className="gap-4">
        <Text className="text-text-secondary">Ingredients: {recipe.uses.join(', ')}</Text>
        <FormField label="Servings prepared" value={servingsMade} editable={!busy} keyboardType="number-pad" onChangeText={setServingsMade} helperText="This prefills leftover portions. Adjust the saved amount to what remains." />
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
        <Button label="Finish without changing pantry" variant="ghost" disabled={busy} onPress={() => void finishWithoutPantryUpdate()} />
      </View>}
      {!!error && <Text accessibilityRole="alert" className="text-urgency-critical mt-4">{error}</Text>}
      {!!error && !record && <Button label="Reload review" variant="outline" disabled={busy || loading} onPress={() => void load()} />}
      {!record?.result && <Button label="Back to cooking" variant="ghost" disabled={busy || loading} onPress={onBack} className="mt-3" />}
    </ScrollView>
  </SafeAreaView>;
}
