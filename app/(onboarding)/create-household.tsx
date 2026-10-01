import React, { useState } from "react";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button } from "@/src/components/atoms";
import { useInventory } from "@/src/context/InventoryContext";

export default function CreateHouseholdScreen() {
    const router = useRouter();
    const { createHousehold } = useInventory();
    const [name, setName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = async () => {
        const trimmedName = name.trim();

        if (!trimmedName) {
            Alert.alert("Missing name", "Enter a household name.");
            return;
        }

        try {
            setSubmitting(true);
            await createHousehold(trimmedName);
            router.replace("/");
        } catch (error) {
            Alert.alert(
                "Could not create household",
                error instanceof Error ? error.message : "Something went wrong.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <RoutePlaceholder
            title="Create Household"
            category="Onboarding"
            routePath="/(onboarding)/create-household"
            description="Initialize a collaborative household for shared pantry tracking."
            iconName="Home"
        >
            <View className="gap-4">
                <FormField
                    label="Household Name"
                    placeholder="e.g. Ordonez Family Kitchen"
                    value={name}
                    onChangeText={setName}
                />

                <Button
                    label={submitting ? "Creating..." : "Initialize Kitchen"}
                    variant="primary"
                    onPress={handleCreate}
                />
            </View>
        </RoutePlaceholder>
    );
}