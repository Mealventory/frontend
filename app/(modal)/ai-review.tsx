import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon, Badge, Avatar } from "@/src/components/atoms";
import { useInventory } from "@/src/context/InventoryContext";
import { defaultScanZone } from "@/src/lib/storageZones";
import type { StorageZone } from "@/src/types";
import { FormField, TagChipGroup } from "@/src/components/molecules";

export default function AIReviewModal() {
  const router = useRouter();
  const { addItem } = useInventory();
  const [name, setName] = useState("Organic Blueberries");
  const [expDate, setExpDate] = useState("2026-09-21");
  const [qty, setQty] = useState("6 oz container");

  const [storageZone, setStorageZone] = useState<StorageZone>(defaultScanZone("Produce"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    if (saving) return;
    const date = expDate.trim();
    if (!name.trim()) { setError("Enter an item name."); return; }
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
      setError("Enter a valid expiration date as YYYY-MM-DD."); return;
    }
    setSaving(true); setError("");
    try {
      await addItem({ id: Date.now().toString(), name: name.trim(), category: "Produce",
        expDate: date || "Not set", expiryDate: date || null, daysLeft: 0,
        quantity: qty, emoji: "🫐", storageZone });
      router.replace("/(app)/(tabs)" as any);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save item."); }
    finally { setSaving(false); }
  };

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
          <Badge label="Sample scan" variant="brand" showDot />
          <View className="w-12" />
        </View>

        <Typography variant="h2" className="font-bold mb-1">
          Review Item
        </Typography>
        <Typography variant="caption" color="muted" className="mb-6">
          Review this sample item before adding it to your kitchen. Live camera recognition is not connected yet.
        </Typography>

        {/* Hero Card */}
        <View className="flex-row items-center p-4 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6">
          <Avatar emoji="🫐" size="lg" className="mr-4" />
          <View className="flex-1">
            <Typography variant="h3" className="font-bold">
              {name}
            </Typography>
            <Typography variant="caption" color="muted">
              Produce · {storageZone}
            </Typography>
          </View>

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

        <Typography variant="caption">Storage zone</Typography>
        <TagChipGroup tags={["pantry", "fridge", "freezer", "spicerack"]}
          selectedTag={storageZone} onSelectTag={(zone) => setStorageZone(zone as StorageZone)} />
        {error ? <Typography>{error}</Typography> : null}

        {/* Action button */}
        <Button
          label={saving ? "Saving…" : "Add to Kitchen"}
          disabled={saving}
          variant="primary"
          leadingIcon={<Icon name="PlusCircle" size={18} color="#FFFFFF" />}
          onPress={save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
