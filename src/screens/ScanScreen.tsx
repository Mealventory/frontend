import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/atoms/Icon";
import { BarcodeScannerFrame } from "@/src/components/molecules/BarcodeScannerFrame";
import { useInventory, FigmaScreen } from "@/src/context/InventoryContext";
import { defaultScanZone } from "@/src/lib/storageZones";
import { TagChipGroup } from "@/src/components/molecules";
import { FoodItem, StorageZone } from "@/src/types";

const sampleScanSuggestions = [
  { name: "Organic Blueberries", category: "Produce", expDate: "Sep 19", daysLeft: 5, quantity: "6 oz", emoji: "🫐" },
  { name: "Reduced Fat Milk", category: "Dairy", expDate: "Sep 21", daysLeft: 7, quantity: "0.5 gallon", emoji: "🥛" },
  { name: "Sliced Turkey Breast", category: "Meat", expDate: "Sep 16", daysLeft: 2, quantity: "8 oz", emoji: "🥩" },
  { name: "Romaine Lettuce", category: "Produce", expDate: "Sep 17", daysLeft: 3, quantity: "1 head", emoji: "🥬" },
];

export interface ScanScreenProps {
  onNavigate: (screen: FigmaScreen) => void;
}

export function ScanScreen({ onNavigate }: ScanScreenProps) {
  const { addItem } = useInventory();
  const [phase, setPhase] = useState<"scan" | "result">("scan");
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<FoodItem | null>(null);
  const [expDate, setExpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [flashOn, setFlashOn] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      const pick = sampleScanSuggestions[Math.floor(Math.random() * sampleScanSuggestions.length)];
      const newItem: FoodItem = {
        ...pick,
        storageZone: defaultScanZone(pick.category),
        id: Date.now().toString(),
      };
      setDetected(newItem);
      setExpDate(pick.expDate);
      setScanning(false);
      setPhase("result");
    }, 1500);
  };

  const handleAddToKitchen = async () => {
    if (!detected || saving) return;
    setSaving(true); setError("");
    try {
      await addItem({ ...detected, expDate });
      onNavigate("home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save item.");
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView
      className={`flex-1 ${
        phase === "scan" ? "bg-black" : "bg-ground-canvas"
      }`}
    >
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onNavigate("home")}
          className="w-[38px] h-[38px] rounded-[14px] bg-white/10 dark:bg-ground-elevated items-center justify-center border border-white/10"
        >
          <Icon name="ArrowLeft" size={18} color={phase === "scan" ? "#FFFFFF" : "#0F172A"} />
        </TouchableOpacity>
        <Text
          className={`text-[16px] font-bold ${
            phase === "scan" ? "text-white" : "text-text-primary"
          }`}
        >
          Scan Item
        </Text>
        <View className="w-[38px]" />
      </View>

      {phase === "scan" ? (
        <View className="flex-1 justify-between px-6 pb-6">
          <View className="flex-1 items-center justify-center">
            {/* Viewfinder reticle */}
            <BarcodeScannerFrame scanning={scanning} />

            {scanning ? (
              <View className="items-center mt-6 gap-2">
                <ActivityIndicator size="small" color="#10B981" />
                <Text className="text-[13px] font-medium text-white/70">
                  Identifying item...
                </Text>
              </View>
            ) : (
              <Text className="text-[13px] text-white/50 text-center mt-6">
                Hold your camera steady over the item or barcode
              </Text>
            )}
          </View>

          {/* Bottom Scan Controls */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setFlashOn(!flashOn)}
              className={`w-[50px] h-[50px] rounded-[16px] items-center justify-center border ${
                flashOn
                  ? "bg-brand-500 border-brand-500"
                  : "bg-white/10 border-white/10"
              }`}
            >
              <Icon name="Zap" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={scanning}
              onPress={handleScan}
              className="flex-1 h-[50px] rounded-[16px] bg-brand-500 items-center justify-center shadow-md shadow-brand-500/40"
            >
              <Text className="text-[16px] font-bold text-white">
                {scanning ? "Scanning..." : "Tap to Scan"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Result Confirmation Sheet */
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          className="flex-1 bg-ground-surface dark:bg-ground-canvas rounded-t-[28px]"
        >
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-5 h-5 rounded-full bg-brand-50 dark:bg-brand-500/20 items-center justify-center">
              <Icon name="Check" size={12} color="#10B981" strokeWidth={3} />
            </View>
            <Text className="text-[14px] font-bold text-brand-500">
              Item found
            </Text>
          </View>

          {detected && (
            <View className="gap-5">
              {/* Item Card */}
              <View className="flex-row items-center p-4 bg-ground-subtle dark:bg-ground-card rounded-[22px] border border-border-default shadow-sm">
                <View className="w-[60px] h-[60px] rounded-[18px] bg-ground-surface dark:bg-ground-elevated items-center justify-center mr-4 shadow-sm">
                  <Text className="text-3xl">{detected.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[18px] font-bold text-text-primary">
                    {detected.name}
                  </Text>
                  <Text className="text-[13px] text-text-muted mt-0.5">
                    {detected.quantity} · {detected.category}
                  </Text>
                </View>
              </View>

              <Text className="text-[12px] font-bold text-text-subtle uppercase tracking-wider mb-2">Storage Zone</Text>
              <TagChipGroup
                tags={["pantry", "fridge", "freezer", "spicerack"]}
                formatLabel={(zone) => (zone === "spicerack" ? "Spices" : zone.charAt(0).toUpperCase() + zone.slice(1))}
                selectedTag={detected.storageZone || "pantry"}
                onSelectTag={(zone) => setDetected({ ...detected, storageZone: zone as StorageZone })}
              />
              {error ? <Text accessibilityRole="alert">{error}</Text> : null}

              {/* Expiration Date Input */}
              <View>
                <Text className="text-[12px] font-bold text-text-subtle uppercase tracking-wider mb-2">
                  Expiration Date
                </Text>
                <View className="flex-row items-center px-4 h-[50px] bg-ground-surface dark:bg-ground-card rounded-[16px] border border-brand-500 shadow-sm">
                  <Icon name="Calendar" size={16} color="#10B981" />
                  <TextInput
                    value={expDate}
                    onChangeText={setExpDate}
                    className="flex-1 ml-2.5 text-[15px] font-medium text-text-primary"
                  />
                  <View className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/20">
                    <Text className="text-[12px] font-bold text-brand-500">
                      {detected.daysLeft}d left
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-2.5 mt-4">
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setPhase("scan")}
                  className="flex-1 h-[50px] rounded-[16px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center border border-border-default"
                >
                  <Text className="text-[15px] font-bold text-text-secondary">
                    Rescan
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={saving}
                  onPress={handleAddToKitchen}
                  className="flex-[2] h-[50px] rounded-[16px] bg-brand-500 items-center justify-center shadow-md shadow-brand-500/30"
                >
                  <Text className="text-[15px] font-bold text-white">
                    Add to Kitchen
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
