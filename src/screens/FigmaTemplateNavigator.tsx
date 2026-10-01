import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useInventory } from "@/src/context/InventoryContext";
import { LoginScreen } from "./LoginScreen";
import { HomeScreen } from "./HomeScreen";
import { ScanScreen } from "./ScanScreen";
import { RecipesScreen } from "./RecipesScreen";
import { ItemDetailScreen } from "./ItemDetailScreen";
import { SettingsScreen } from "./SettingsScreen";

export function FigmaTemplateNavigator() {
    const { currentScreen, navigate, loading } = useInventory();

    if (loading) {
        return (
            <View className="flex-1 bg-ground-canvas items-center justify-center">
                <ActivityIndicator size="large" />
                <Text className="text-text-muted mt-3">Loading Mealventory...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-ground-canvas">
            {currentScreen === "login" && (
                <LoginScreen onNavigate={navigate} />
            )}

            {currentScreen === "home" && (
                <HomeScreen onNavigate={navigate} />
            )}

            {currentScreen === "scan" && (
                <ScanScreen onNavigate={navigate} />
            )}

            {currentScreen === "recipes" && (
                <RecipesScreen onNavigate={navigate} />
            )}

            {currentScreen === "item-detail" && (
                <ItemDetailScreen onNavigate={navigate} />
            )}

            {currentScreen === "settings" && (
                <SettingsScreen onNavigate={navigate} />
            )}
        </View>
    );
}