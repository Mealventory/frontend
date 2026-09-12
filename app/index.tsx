import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView className="flex-1 bg-[#020617] items-center justify-center px-6">
      <View className="items-center">
        <Text className="text-3xl font-bold text-slate-100 tracking-tight text-center">
          Mealventory
        </Text>
        <Text className="text-sm text-emerald-400 font-medium mt-2 text-center">
          Ready for use
        </Text>
      </View>
    </SafeAreaView>
  );
}
