import { useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { Badge, Button, Icon, Typography } from '@/src/components/atoms';
import { StorageLocationLabelCard } from '@/src/components/domain/StorageLocationLabelCard';
import { RoutePlaceholder } from '@/src/components/layout/RoutePlaceholder';
import { useAuth } from '@/src/context/AuthContext';
import { useInventory } from '@/src/context/InventoryContext';
import {
  assignItemToSubLocation,
  buildStorageLocationQrPayload,
  filterItemsBySubLocation,
  loadStorageLocationStore,
  resolveScannedStorageLocation,
  saveStorageLocationStore,
  storageLocationZoneLabel,
  type StorageLocationStore,
} from '@/src/lib/storageLocations';

function singleParam(val: string | string[] | undefined): string | undefined {
  return Array.isArray(val) ? val[0] : val;
}

export default function StorageLocationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string | string[];
    qr?: string | string[];
    v?: string | string[];
    h?: string | string[];
    l?: string | string[];
  }>();
  const { session, household } = useAuth();
  const { inventory, openItem } = useInventory();
  const householdId = household?.id ?? '';

  const [store, setStore] = useState<StorageLocationStore>(() =>
    loadStorageLocationStore(householdId)
  );
  const [showQr, setShowQr] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);

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

  const rawQr = useMemo(() => {
    const explicit = singleParam(params.qr);
    if (explicit) return explicit;
    const idParam = singleParam(params.id);
    if (idParam && householdId) {
      return buildStorageLocationQrPayload(householdId, idParam);
    }
    const v = singleParam(params.v);
    const h = singleParam(params.h);
    const l = singleParam(params.l);
    if (v || h || l) {
      return `mealventory://storage-location?v=${encodeURIComponent(v ?? '')}&h=${encodeURIComponent(h ?? '')}&l=${encodeURIComponent(l ?? '')}`;
    }
    return '';
  }, [params.qr, params.id, params.v, params.h, params.l, householdId]);

  const resolution = useMemo(
    () =>
      resolveScannedStorageLocation({
        rawPayload: rawQr,
        authenticated: Boolean(session),
        activeHouseholdId: household?.id,
        locations: store.locations,
      }),
    [rawQr, session, household?.id, store.locations]
  );

  const location = resolution.ok ? resolution.location : null;
  const itemsInLocation = useMemo(
    () => (location ? filterItemsBySubLocation(inventory, store, location.id) : []),
    [inventory, store, location]
  );
  const movableItems = useMemo(
    () =>
      location
        ? inventory.filter((item) => store.assignments[item.id] !== location.id)
        : [],
    [inventory, store, location]
  );

  const moveItem = (itemId: string, targetLocationId: string | null) => {
    const next = assignItemToSubLocation(store, itemId, targetLocationId);
    setStore(next);
    saveStorageLocationStore(householdId, next);
  };

  if (!resolution.ok || !location) {
    return (
      <RoutePlaceholder
        title="Storage Label"
        category="Household"
        routePath="/(app)/household/storage-location"
        description="Verify household storage label QR codes before showing pantry items."
        iconName="AlertCircle"
        showBackToHome={false}
      >
        <View className="p-4 rounded-2xl bg-ground-card border border-border-default gap-3">
          <Typography variant="h3" className="font-bold">
            Unable to Open Storage Label
          </Typography>
          <Typography variant="body" color="muted">
            {resolution.ok ? 'Storage location unavailable.' : resolution.message}
          </Typography>
          <Button
            label="Manage Storage Labels"
            variant="primary"
            onPress={() => router.replace('/(app)/household/storage-labels' as any)}
          />
        </View>
      </RoutePlaceholder>
    );
  }

  return (
    <RoutePlaceholder
      title={location.name}
      category="Household"
      routePath="/(app)/household/storage-location"
      description={location.instructions || 'Items assigned to this physical shelf or bin.'}
      iconName="Package"
      showBackToHome={false}
    >
      <View className="gap-4">
        <View className="flex-row flex-wrap items-center gap-2">
          <Badge label={storageLocationZoneLabel(location.zone)} variant="neutral" size="sm" />
          <Badge
            label={`${itemsInLocation.length} ${itemsInLocation.length === 1 ? 'item' : 'items'}`}
            variant="fresh"
            size="sm"
          />
          {location.archived && <Badge label="Archived" variant="soon" size="sm" />}
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Button
            label="Add item here"
            variant="primary"
            leadingIcon={<Icon name="Plus" size={16} color="#FFFFFF" />}
            onPress={() =>
              router.push({
                pathname: '/(modal)/manual-add',
                params: {
                  zone: location.zone,
                  locationId: location.id,
                  locationName: location.name,
                },
              } as any)
            }
          />
          <Button
            label={showMovePicker ? 'Done Moving' : 'Move Existing Item'}
            variant="outline"
            disabled={location.archived || movableItems.length === 0}
            onPress={() => setShowMovePicker((prev) => !prev)}
          />
          <Button
            label={showQr ? 'Hide QR Label' : 'Show QR Label'}
            variant="ghost"
            onPress={() => setShowQr((prev) => !prev)}
          />
        </View>

        {showQr && (
          <StorageLocationLabelCard
            location={location}
            householdName={household?.name}
          />
        )}

        {showMovePicker && !location.archived && (
          <View className="p-4 rounded-2xl bg-ground-card border border-border-default gap-2">
            <Typography variant="caption" className="font-bold uppercase" color="muted">
              Move item into {location.name}
            </Typography>
            {movableItems.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center justify-between gap-2 py-2 border-b border-border-default"
              >
                <Typography variant="body" className="flex-1" numberOfLines={1}>
                  {item.emoji} {item.name}
                </Typography>
                <Button
                  label="Move Here"
                  size="sm"
                  variant="outline"
                  onPress={() => moveItem(item.id, location.id)}
                />
              </View>
            ))}
          </View>
        )}

        {itemsInLocation.length === 0 ? (
          <View className="p-5 rounded-2xl bg-ground-card border border-border-default gap-2">
            <Typography variant="body" className="font-semibold">
              Nothing in {location.name} yet
            </Typography>
            <Typography variant="caption" color="muted">
              Tap "Add item here" to log a new item directly to this spot, or move an existing pantry item here.
            </Typography>
          </View>
        ) : (
          <View className="gap-2.5">
            {itemsInLocation.map((item) => (
              <View
                key={item.id}
                className="p-3.5 rounded-2xl bg-ground-card border border-border-default flex-row items-center justify-between gap-3"
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => openItem(item)}
                  className="flex-1"
                >
                  <Typography variant="body" className="font-semibold">
                    {item.emoji} {item.name}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {item.quantity} · {item.expDate}
                  </Typography>
                </TouchableOpacity>
                <Button
                  label="Unassign"
                  variant="ghost"
                  size="sm"
                  onPress={() => moveItem(item.id, null)}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </RoutePlaceholder>
  );
}
