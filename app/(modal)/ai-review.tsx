import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon, Badge, Avatar } from "@/src/components/atoms";
import { FormField } from "@/src/components/molecules";

export default function AIReviewModal() {
  const router = useRouter();
  const [name, setName] = useState("Organic Blueberries");
  const [expDate, setExpDate] = useState("2026-09-21");
  const [qty, setQty] = useState("6 oz container");

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Button
            label="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
          />
          <Badge label="AI Vision Detected" variant="brand" showDot />
          <View className="w-12" />
        </View>

        <Typography variant="h2" className="font-bold mb-1">
          Review Item
        </Typography>
        <Typography variant="caption" color="muted" className="mb-6">
          Verify Gemini-extracted item attributes before committing to pantry
        </Typography>

        {/* Hero Card */}
        <View className="flex-row items-center p-4 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6">
          <Avatar emoji="🫐" size="lg" className="mr-4" />
          <View className="flex-1">
            <Typography variant="h3" className="font-bold">
              {name}
            </Typography>
            <Typography variant="caption" color="muted">
              Produce · Refrigerator
            </Typography>
          </View>
          <Badge label="98% confidence" variant="fresh" size="sm" />
        </View>

        {/* Form Fields */}
        <View className="gap-4 mb-6">
          <FormField
            label="Product Name"
            value={name}
            onChangeText={setName}
            leadingIcon={<Icon name="Tag" size={16} color="#94A3B8" />}
          />
          <FormField
            label="Expiration Date"
            value={expDate}
            onChangeText={setExpDate}
            leadingIcon={<Icon name="Calendar" size={16} color="#94A3B8" />}
          />
          <FormField
            label="Quantity / Size"
            value={qty}
            onChangeText={setQty}
            leadingIcon={<Icon name="Package" size={16} color="#94A3B8" />}
          />
        </View>

        {/* Action button */}
        <Button
          label="Add to Household Pantry"
          variant="primary"
          leadingIcon={<Icon name="PlusCircle" size={18} color="#FFFFFF" />}
          onPress={() => router.replace("/(app)/(tabs)" as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
