import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../atoms';
import { Icon } from '../atoms/Icon';
import type { SyncConflict } from '../../lib/offlineSync';

export interface OfflineSyncBannerProps {
  isOnline?: boolean;
  pendingSyncCount?: number;
  isSyncing?: boolean;
  syncToast?: string;
  syncConflicts?: SyncConflict[];
  onSyncNow?: () => void;
  onRetryConflict?: (conflictId: string) => void;
  onDismissConflict?: (conflictId: string) => void;
  onDismissToast?: () => void;
}

export function OfflineSyncBanner({
  isOnline = true,
  pendingSyncCount = 0,
  isSyncing = false,
  syncToast = '',
  syncConflicts = [],
  onSyncNow,
  onRetryConflict,
  onDismissConflict,
  onDismissToast,
}: OfflineSyncBannerProps) {
  const showStatus = !isOnline || isSyncing || pendingSyncCount > 0;
  const showToast = Boolean(syncToast);
  const showConflicts = syncConflicts.length > 0;

  if (!showStatus && !showToast && !showConflicts) {
    return null;
  }

  const changeWord = pendingSyncCount === 1 ? 'change' : 'changes';

  return (
    <View className="gap-2">
      {showToast ? (
        <View
          accessibilityRole="status"
          accessibilityLabel={syncToast}
          className="flex-row items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"
        >
          <View className="flex-1 flex-row items-center gap-2">
            <Icon name="CheckCircle2" size={18} color="#10B981" />
            <Typography variant="caption" className="flex-1 text-emerald-900 font-semibold">
              {syncToast}
            </Typography>
          </View>
          {onDismissToast ? (
            <TouchableOpacity
              onPress={onDismissToast}
              accessibilityRole="button"
              accessibilityLabel="Dismiss sync notification"
              className="p-1"
            >
              <Icon name="X" size={15} color="#065F46" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showStatus ? (
        <View
          accessibilityRole="status"
          accessibilityLabel={
            !isOnline
              ? pendingSyncCount > 0
                ? `Offline, ${pendingSyncCount} ${changeWord} pending sync`
                : 'Offline, showing cached pantry'
              : isSyncing
              ? 'Syncing pending changes'
              : `${pendingSyncCount} ${changeWord} waiting to sync`
          }
          className={`flex-row items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
            !isOnline
              ? 'border-amber-200 bg-amber-50'
              : 'border-sky-200 bg-sky-50'
          }`}
        >
          <View className="flex-1 flex-row items-center gap-2">
            <Icon
              name={!isOnline ? 'WifiOff' : 'RefreshCw'}
              size={18}
              color={!isOnline ? '#B45309' : '#0284C7'}
            />
            <View className="flex-1">
              <Typography
                variant="caption"
                className={`font-semibold ${
                  !isOnline ? 'text-amber-950' : 'text-sky-950'
                }`}
              >
                {!isOnline
                  ? pendingSyncCount > 0
                    ? `Offline · ${pendingSyncCount} ${changeWord} pending sync`
                    : 'Offline · Showing cached pantry'
                  : isSyncing
                  ? `Back online · Syncing ${pendingSyncCount || ''} ${changeWord}...`.replace(
                      /\s+/g,
                      ' ',
                    )
                  : `${pendingSyncCount} ${changeWord} pending sync`}
              </Typography>
              {!isOnline && pendingSyncCount > 0 ? (
                <Typography variant="tiny" className="text-amber-800 normal-case tracking-normal font-medium">
                  Queued changes will upload automatically once reconnected.
                </Typography>
              ) : null}
            </View>
          </View>

          {isOnline && !isSyncing && pendingSyncCount > 0 && onSyncNow ? (
            <TouchableOpacity
              onPress={onSyncNow}
              accessibilityRole="button"
              accessibilityLabel="Sync pending changes"
              className="rounded-lg bg-sky-600 px-2.5 py-1.5"
            >
              <Typography variant="tiny" color="inverse" className="normal-case tracking-normal">
                Sync now
              </Typography>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showConflicts
        ? syncConflicts.map((conflict) => (
            <View
              key={conflict.id}
              accessibilityRole="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 gap-2"
            >
              <View className="flex-row items-start gap-2">
                <Icon name="AlertTriangle" size={18} color="#BE123C" />
                <View className="flex-1">
                  <Typography variant="caption" className="font-semibold text-rose-950">
                    Sync conflict · {conflict.itemName}
                  </Typography>
                  <Typography variant="tiny" className="text-rose-800 normal-case tracking-normal font-normal">
                    {conflict.message}
                  </Typography>
                </View>
              </View>
              <View className="flex-row items-center justify-end gap-2">
                {onRetryConflict ? (
                  <TouchableOpacity
                    onPress={() => onRetryConflict(conflict.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Retry sync for ${conflict.itemName}`}
                    className="rounded-lg border border-rose-300 bg-white px-2.5 py-1"
                  >
                    <Typography variant="tiny" className="text-rose-900 normal-case tracking-normal">
                      Retry
                    </Typography>
                  </TouchableOpacity>
                ) : null}
                {onDismissConflict ? (
                  <TouchableOpacity
                    onPress={() => onDismissConflict(conflict.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Dismiss sync conflict for ${conflict.itemName}`}
                    className="rounded-lg bg-rose-600 px-2.5 py-1"
                  >
                    <Typography variant="tiny" color="inverse" className="normal-case tracking-normal">
                      Dismiss
                    </Typography>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))
        : null}
    </View>
  );
}
