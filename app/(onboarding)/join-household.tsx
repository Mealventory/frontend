import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button } from "@/src/components/atoms";
import {
  isValidInviteCode,
  normalizeInviteCode,
} from "@/src/lib/householdInvites";

export default function JoinHouseholdScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const incomingCode = useMemo(
    () =>
      normalizeInviteCode(
        Array.isArray(params.code) ? params.code[0] || "" : params.code || ""
      ),
    [params.code]
  );
  const [inviteCode, setInviteCode] = useState(incomingCode);

  // QR scans and shared Mealventory links land on this route first.
  // The root household route owns the real authenticated join request.
  useEffect(() => {
    if (!isValidInviteCode(incomingCode)) return;
    router.replace({
      pathname: "/",
      params: { invite: incomingCode },
    } as any);
  }, [incomingCode, router]);

  const continueToJoin = () => {
    const normalized = normalizeInviteCode(inviteCode);
    if (!isValidInviteCode(normalized)) return;
    router.replace({
      pathname: "/",
      params: { invite: normalized },
    } as any);
  };

  return (
    <RoutePlaceholder
      title="Join Household"
      category="Onboarding"
      routePath="/(onboarding)/join-household"
      description="Enter the 6-character alphanumeric code shared by someone in your household."
      iconName="Key"
    >
      <View className="gap-4">
        <FormField
          label="6-Character Invite Code"
          placeholder="e.g. ABC123"
          value={inviteCode}
          onChangeText={(val) => setInviteCode(normalizeInviteCode(val))}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />
        <Button
          label="Continue to Join"
          variant="primary"
          disabled={!isValidInviteCode(inviteCode)}
          onPress={continueToJoin}
        />
      </View>
    </RoutePlaceholder>
  );
}
