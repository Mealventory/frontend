import { useMemo, useRef, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

import { Icon, Typography } from '@/src/components/atoms';
import { householdInviteLink, householdInviteShareText } from '@/src/lib/householdInvites';

export function HouseholdInviteCard({
  householdName,
  inviteCode,
  compact = false,
}: {
  householdName: string;
  inviteCode: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const link = useMemo(() => householdInviteLink(inviteCode), [inviteCode]);

  const copyCode = async () => {
    setError('');
    try {
      await Clipboard.setStringAsync(inviteCode);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Could not copy the invite code. You can still select the code or share the invite.');
    }
  };

  const shareInvite = async () => {
    setError('');
    try {
      await Share.share(
        {
          title: `Join ${householdName} on Mealventory`,
          message: householdInviteShareText(householdName, inviteCode),
        },
        {
          dialogTitle: `Invite someone to ${householdName}`,
        }
      );
    } catch {
      setError('Could not open the share sheet. Try copying the code instead.');
    }
  };

  return (
    <View className="gap-3">
      <View className="items-center">
        <View className="p-4 rounded-2xl bg-white border border-border-default">
          <QRCode
            value={link}
            size={compact ? 148 : 184}
            color="#0F172A"
            backgroundColor="#FFFFFF"
          />
        </View>
        <Typography variant="caption" color="muted" className="mt-2 text-center">
          Scan to open the Mealventory household join flow
        </Typography>
      </View>

      <View className="p-3.5 bg-ground-subtle dark:bg-ground-elevated rounded-xl border border-border-default flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Typography variant="tiny" color="muted">
            HOUSEHOLD INVITE CODE
          </Typography>
          <Text selectable className="text-lg font-bold tracking-widest text-text-primary mt-0.5 font-mono">
            {inviteCode}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy household invite code"
          onPress={() => void copyCode()}
          className="flex-row items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-brand-50 dark:bg-brand-500/20 border border-brand-500/30"
        >
          <Icon name={copied ? 'Check' : 'Copy'} size={14} color="#10B981" />
          <Text className="text-xs font-semibold text-brand-500">{copied ? 'Copied!' : 'Copy'}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Share invite to ${householdName}`}
        onPress={() => void shareInvite()}
        className="min-h-[48px] px-4 rounded-xl bg-brand-500 flex-row items-center justify-center gap-2"
      >
        <Icon name="Share2" size={17} color="#FFFFFF" />
        <Text className="text-white font-bold">Share Invite</Text>
      </Pressable>

      {!!error && (
        <Text accessibilityRole="alert" className="text-xs text-urgency-critical text-center">
          {error}
        </Text>
      )}
    </View>
  );
}
