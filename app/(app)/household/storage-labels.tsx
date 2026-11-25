import { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { Badge, Button, Icon, Typography } from '@/src/components/atoms';
import { FormField, TagChipGroup } from '@/src/components/molecules';
import { StorageLocationLabelCard } from '@/src/components/domain/StorageLocationLabelCard';
import { RoutePlaceholder } from '@/src/components/layout/RoutePlaceholder';
import { useAuth } from '@/src/context/AuthContext';
import { useInventory } from '@/src/context/InventoryContext';
import {
  createSubLocation,
  deleteSubLocationSafely,
  loadStorageLocationStore,
  renameSubLocation,
  saveStorageLocationStore,
  setSubLocationArchived,
  storageLocationZoneLabel,
  VALID_STORAGE_ZONES,
  type StorageLocationStore,
  type StorageSubLocation,
} from '@/src/lib/storageLocations';
import type { StorageZone } from '@/src/types';

export default function StorageLabelsScreen() {
  const router = useRouter();
  const { household } = useAuth();
  const { inventory } = useInventory();
  const householdId = household?.id ?? '';

  const [store, setStore] = useState<StorageLocationStore>(() =>
    loadStorageLocationStore(householdId)
  );
  const [name, setName] = useState('');
  const [zone, setZone] = useState<StorageZone>('pantry');
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState('');
  const [expandedQrId, setExpandedQrId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingInstructions, setEditingInstructions] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setStore(loadStorageLocationStore(householdId));
  }, [householdId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const persist = (next: StorageLocationStore) => {
    setStore(next);
    saveStorageLocationStore(householdId, next);
  };

  const handleCreate = () => {
    if (!householdId) {
      setError('Select a household before creating storage labels.');
      return;
    }
    setError('');
    try {
      const { store: next, location } = createSubLocation(store, {
        householdId,
        zone,
        name,
        instructions,
      });
      persist(next);
      setName('');
      setInstructions('');
      setExpandedQrId(location.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create storage label.');
    }
  };

  const startEditing = (loc: StorageSubLocation) => {
    setEditingId(loc.id);
    setEditingName(loc.name);
    setEditingInstructions(loc.instructions ?? '');
    setDeletingId(null);
    setError('');
  };

  const saveEdit = (locId: string) => {
    setError('');
    try {
      const next = renameSubLocation(store, locId, {
        name: editingName,
        instructions: editingInstructions,
      });
      persist(next);
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not rename storage label.');
    }
  };

  const toggleArchive = (loc: StorageSubLocation) => {
    setError('');
    persist(setSubLocationArchived(store, loc.id, !loc.archived));
  };

  const confirmDelete = (locId: string) => {
    setError('');
    try {
      const { store: next } = deleteSubLocationSafely(store, locId, reassignTargetId);
      persist(next);
      setDeletingId(null);
      setReassignTargetId(null);
      if (expandedQrId === locId) setExpandedQrId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete storage label.');
    }
  };

  const itemCountFor = (locId: string) =>
    inventory.filter((item) => store.assignments[item.id] === locId).length;

  const activeLocations = store.locations.filter((loc) => !loc.archived);
  const archivedLocations = store.locations.filter((loc) => loc.archived);

  return (
    <RoutePlaceholder
      title="QR Shelf & Bin Labels"
      category="Household"
      routePath="/(app)/household/storage-labels"
      description="Create named bins and shelves, print or share QR labels, and scan a label to jump straight to its items."
      iconName="QrCode"
      showBackToHome={false}
    >
      <View className="gap-4">
        <Button
          label="Scan Bin or Shelf QR"
          variant="outline"
          leadingIcon={<Icon name="ScanLine" size={18} color="#10B981" />}
          onPress={() =>
            router.push({
              pathname: '/(modal)/scanner',
              params: { mode: 'barcode' },
            } as any)
          }
        />

        <View className="p-4 rounded-2xl bg-ground-card border border-border-default gap-3">
          <Typography variant="h3" className="font-bold">
            New Shelf or Bin
          </Typography>
          <FormField
            label="Location Name"
            placeholder="e.g. Bottom Drawer or Cereal Shelf"
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (error) setError('');
            }}
          />
          <View>
            <Typography variant="caption" className="font-semibold mb-2">
              Storage Zone
            </Typography>
            <TagChipGroup
              tags={[...VALID_STORAGE_ZONES]}
              selectedTag={zone}
              onSelectTag={(selected) => setZone(selected as StorageZone)}
            />
          </View>
          <FormField
            label="Label Note (Optional)"
            placeholder="e.g. Keep opened snacks sealed"
            value={instructions}
            onChangeText={setInstructions}
          />
          {!!error && (
            <Typography variant="caption" color="critical">
              {error}
            </Typography>
          )}
          <Button
            label="Create & Generate QR Label"
            variant="primary"
            leadingIcon={<Icon name="Plus" size={16} color="#FFFFFF" />}
            onPress={handleCreate}
            disabled={!name.trim()}
          />
        </View>

        {store.locations.length === 0 ? (
          <View className="p-5 rounded-2xl bg-ground-card border border-border-default">
            <Typography variant="body" className="font-semibold">
              No shelf or bin labels yet
            </Typography>
            <Typography variant="caption" color="muted" className="mt-1">
              Add a sub-location like "Fridge → Bottom Drawer" above to generate a scannable QR label.
            </Typography>
          </View>
        ) : (
          <View className="gap-3">
            {activeLocations.map((loc) => {
              const count = itemCountFor(loc.id);
              const otherActive = activeLocations.filter((other) => other.id !== loc.id);
              return (
                <View
                  key={loc.id}
                  className="p-4 rounded-2xl bg-ground-card border border-border-default gap-3"
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${loc.name}, ${storageLocationZoneLabel(loc.zone)}`}
                    onPress={() =>
                      router.push({
                        pathname: '/(app)/household/storage-location',
                        params: { id: loc.id },
                      } as any)
                    }
                    className="flex-row items-center justify-between gap-3"
                  >
                    <View className="flex-1">
                      <Typography variant="body" className="font-bold">
                        {loc.name}
                      </Typography>
                      <Typography variant="caption" color="muted">
                        {storageLocationZoneLabel(loc.zone)} · {count} {count === 1 ? 'item' : 'items'}
                      </Typography>
                    </View>
                    <Icon name="ChevronRight" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      label={expandedQrId === loc.id ? 'Hide QR' : 'Show QR Label'}
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        setExpandedQrId(expandedQrId === loc.id ? null : loc.id)
                      }
                    />
                    <Button
                      label="Rename"
                      variant="ghost"
                      size="sm"
                      onPress={() => startEditing(loc)}
                    />
                    <Button
                      label="Archive"
                      variant="ghost"
                      size="sm"
                      onPress={() => toggleArchive(loc)}
                    />
                    <Button
                      label="Remove"
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setDeletingId(deletingId === loc.id ? null : loc.id);
                        setReassignTargetId(null);
                        setEditingId(null);
                      }}
                    />
                  </View>

                  {editingId === loc.id && (
                    <View className="p-3 rounded-xl bg-ground-subtle gap-2">
                      <FormField
                        label="New Name"
                        value={editingName}
                        onChangeText={setEditingName}
                      />
                      <FormField
                        label="Label Note"
                        value={editingInstructions}
                        onChangeText={setEditingInstructions}
                      />
                      <View className="flex-row gap-2">
                        <Button label="Save" size="sm" onPress={() => saveEdit(loc.id)} />
                        <Button
                          label="Cancel"
                          variant="ghost"
                          size="sm"
                          onPress={() => setEditingId(null)}
                        />
                      </View>
                    </View>
                  )}

                  {deletingId === loc.id && (
                    <View className="p-3 rounded-xl bg-ground-subtle gap-2">
                      <Typography variant="caption" className="font-semibold">
                        Items stay safe in your pantry. Move {count} assigned {count === 1 ? 'item' : 'items'} to:
                      </Typography>
                      <View className="flex-row flex-wrap gap-2">
                        <Button
                          label="Zone only (unassign)"
                          variant={reassignTargetId === null ? 'primary' : 'outline'}
                          size="sm"
                          onPress={() => setReassignTargetId(null)}
                        />
                        {otherActive.map((target) => (
                          <Button
                            key={target.id}
                            label={target.name}
                            variant={reassignTargetId === target.id ? 'primary' : 'outline'}
                            size="sm"
                            onPress={() => setReassignTargetId(target.id)}
                          />
                        ))}
                      </View>
                      <View className="flex-row gap-2 mt-1">
                        <Button
                          label="Confirm Remove"
                          variant="primary"
                          size="sm"
                          onPress={() => confirmDelete(loc.id)}
                        />
                        <Button
                          label="Cancel"
                          variant="ghost"
                          size="sm"
                          onPress={() => setDeletingId(null)}
                        />
                      </View>
                    </View>
                  )}

                  {expandedQrId === loc.id && (
                    <StorageLocationLabelCard
                      location={loc}
                      householdName={household?.name}
                      compact
                    />
                  )}
                </View>
              );
            })}

            {archivedLocations.length > 0 && (
              <View className="gap-2 pt-2">
                <Typography variant="caption" color="muted" className="font-bold uppercase">
                  Archived Labels
                </Typography>
                {archivedLocations.map((loc) => (
                  <View
                    key={loc.id}
                    className="p-3.5 rounded-2xl bg-ground-card border border-border-default flex-row items-center justify-between gap-2"
                  >
                    <View className="flex-1">
                      <Typography variant="body" color="muted">
                        {loc.name}
                      </Typography>
                      <Typography variant="tiny" color="muted">
                        {storageLocationZoneLabel(loc.zone)} · Archived
                      </Typography>
                    </View>
                    <Badge label="Archived" variant="neutral" size="sm" />
                    <Button
                      label="Restore"
                      variant="outline"
                      size="sm"
                      onPress={() => toggleArchive(loc)}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </RoutePlaceholder>
  );
}
