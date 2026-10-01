import React, { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button } from "@/src/components/atoms";
import { useInventory } from "@/src/context/InventoryContext";

export default function JoinHouseholdScreen() {
    const router = useRouter();
    const { joinHousehold } = useInventory();

    const [inviteCode, setInviteCode] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleJoin = async () => {
        const code = inviteCode.trim().toUpperCase();

        if (!/^[A-Z0-9]{6}$/.test(code)) {
            Alert.alert(
                "Invalid invite code",
                "The invite code must be 6 letters/numbers.",
            );
            return;
        }

        try {
            setSubmitting(true);
            await joinHousehold(code);
            router.replace("/");
        } catch (error) {
            Alert.alert(
                "Could not join household",
                error instanceof Error ? error.message : "Something went wrong.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <RoutePlaceholder
            title="Join Household"
            category="Onboarding"
            routePath="/(onboarding)/join-household"
            description="Enter the invite code provided by your household admin."
            iconName="Key"
        >
            <View className="gap-4">
                <FormField
                    label="6-Digit Invite Code"
                    placeholder="e.g. MEAL99"
                    value={inviteCode}
                    onChangeText={(value) => setInviteCode(value.toUpperCase())}
                    autoCapitalize="characters"
                />

                <Button
                    label={submitting ? "Joining..." : "Join Household"}
                    variant="primary"
                    onPress={handleJoin}
                />
            </View>
        </RoutePlaceholder>
    );
}