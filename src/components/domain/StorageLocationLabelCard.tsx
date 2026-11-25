import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { Badge, Icon, Typography } from '@/src/components/atoms';
import {
  buildStorageLocationQrPayload,
  storageLocationShareText,
  storageLocationZoneLabel,
  type StorageSubLocation,
} from '@/src/lib/storageLocations';

export function StorageLocationLabelCard({
  location,
  householdName,
  compact = false,
  children,
}: {
  location: StorageSubLocation;
  householdName?: string;
  compact?: boolean;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const payload = useMemo(
    () => buildStorageLocationQrPayload(location.householdId, location.id),
    [location.householdId, location.id]
  );

  const copyPayload = async () => {
    setError('');
    try {
      await Clipboard.setStringAsync(payload);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy the storage label link. You can still share or print the label.');
    }
  };

  const shareLabel = async () => {
    setError('');
    try {
      await Share.share(
        {
          title: `${storageLocationZoneLabel(location.zone)} → ${location.name}`,
          message: storageLocationShareText(location, householdName),
        },
        {
          dialogTitle: `Share label for ${location.name}`,
        }
      );
    } catch {
      setError('Could not open the share sheet. Try copying the label link instead.');
    }
  };

  return (
    <View className="gap-3 p-4 rounded-2xl bg-ground-card border border-border-default">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Typography variant="h3" className="font-bold">
            {location.name}
          </Typography>
          <Typography variant="caption" color="muted">
            {storageLocationZoneLabel(location.zone)}
            {householdName ? ` · ${householdName}` : ''}
          </Typography>
        </View>
        <Badge label={storageLocationZoneLabel(location.zone)} variant="neutral" size="sm" />
      </View>

      {!!location.instructions && (
        <View className="p-2.5 rounded-xl bg-ground-subtle">
          <Typography variant="caption" color="secondary">
            {location.instructions}
          </Typography>
        </View>
      )}

      <View className="items-center">
        <View className="p-4 rounded-2xl bg-white border border-border-default">
          <QRCode
            value={payload}
            size={compact ? 140 : 176}
            color="#0F172A"
            backgroundColor="#FFFFFF"
          />
        </View>
        <Typography variant="caption" color="muted" className="mt-2 text-center">
          Print or stick this label on the shelf or bin. Scan in Mealventory to view or add items here.
        </Typography>
      </View>

      {children}

      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy QR link for ${location.name}`}
          onPress={() => void copyPayload()}
          className="flex-1 min-h-[44px] px-3 rounded-xl bg-brand-50 dark:bg-brand-500/20 border border-brand-500/30 flex-row items-center justify-center gap-1.5"
        >
          <Icon name={copied ? 'Check' : 'Copy'} size={15} color="#10B981" />
          <Text className="text-xs font-semibold text-brand-500">
            {copied ? 'Copied!' : 'Copy Link'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share or print label for ${location.name}`}
          onPress={() => void shareLabel()}
          className="flex-1 min-h-[44px] px-3 rounded-xl bg-brand-500 flex-row items-center justify-center gap-1.5"
        >
          <Icon name="Share2" size={15} color="#FFFFFF" />
          <Text className="text-xs font-bold text-white">Share / Print</Text>
        </Pressable>
      </View>

      {!!error && (
        <Text accessibilityRole="alert" className="text-xs text-urgency-critical text-center">
          {error}
        </Text>
      )}
    </View>
  );
}
