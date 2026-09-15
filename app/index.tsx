import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FigmaTemplateNavigator } from "@/src/screens/FigmaTemplateNavigator";

export default function IndexScreen() {
  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <FigmaTemplateNavigator />
    </SafeAreaView>
  );
}
