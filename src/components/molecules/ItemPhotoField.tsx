import React, { useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button, Icon, Typography } from "@/src/components/atoms";
import { ItemPhoto } from "@/src/components/domain/ItemPhoto";
import { compressImageForUpload } from "@/src/lib/imageOptimizer";

export interface SelectedItemPhoto {
  uri: string;
  base64: string;
  mimeType: string;
}

export function ItemPhotoField({
  existingRef,
  selected,
  removed = false,
  fallbackEmoji = "🍽️",
  disabled = false,
  onChange,
  onRemove,
  onError,
}: {
  existingRef?: string | null;
  selected?: SelectedItemPhoto | null;
  removed?: boolean;
  fallbackEmoji?: string;
  disabled?: boolean;
  onChange: (photo: SelectedItemPhoto) => void;
  onRemove: () => void;
  onError?: (message: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const hasPhoto = Boolean(selected || (!removed && existingRef));

  const choose = async (source: "camera" | "library") => {
    if (disabled || picking) return;
    setPicking(true);
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        onError?.(
          source === "camera"
            ? "Camera permission is required to take an item photo."
            : "Photo library permission is required to choose an item photo.",
        );
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.75,
              base64: true,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              allowsEditing: false,
              quality: 0.75,
              base64: true,
            });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        onError?.("The selected photo could not be read. Please choose another image.");
        return;
      }

      const compressed = await compressImageForUpload(asset.uri, {
        maxWidth: 1600,
        quality: 0.78,
      });
      const compressedMatch = compressed.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
      const base64 = compressedMatch?.[2] || asset.base64;
      const mimeType = compressedMatch?.[1] || asset.mimeType || "image/jpeg";
      const approximateBytes = Math.ceil(base64.length * 3 / 4);
      if (approximateBytes > 5 * 1024 * 1024) {
        onError?.("This photo is still too large after compression. Choose a smaller image.");
        return;
      }

      onChange({
        uri: compressedMatch ? compressed : asset.uri,
        base64,
        mimeType,
      });
    } catch {
      onError?.("Could not open the photo picker. Please try again.");
    } finally {
      setPicking(false);
    }
  };

  return (
    <View>
      <Typography
        variant="caption"
        className="font-semibold text-text-secondary uppercase tracking-wider mb-2 ml-1"
      >
        Item Photo
      </Typography>

      <View className="rounded-2xl border border-border-default bg-ground-surface p-4">
        <View className="items-center mb-4">
          {selected ? (
            <Image
              source={{ uri: selected.uri }}
              resizeMode="cover"
              accessibilityLabel="Selected item photo"
              style={{ width: 156, height: 156, borderRadius: 22 }}
            />
          ) : !removed && existingRef ? (
            <ItemPhoto
              imageRef={existingRef}
              emoji={fallbackEmoji}
              size={156}
              borderRadius={22}
            />
          ) : (
            <ItemPhoto
              emoji={fallbackEmoji}
              size={156}
              borderRadius={22}
            />
          )}
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              label={hasPhoto ? "Retake" : "Take Photo"}
              variant="secondary"
              size="sm"
              disabled={disabled || picking}
              leadingIcon={<Icon name="Camera" size={16} />}
              onPress={() => void choose("camera")}
            />
          </View>
          <View className="flex-1">
            <Button
              label={hasPhoto ? "Replace" : "Choose Photo"}
              variant="secondary"
              size="sm"
              disabled={disabled || picking}
              leadingIcon={<Icon name="Image" size={16} />}
              onPress={() => void choose("library")}
            />
          </View>
        </View>

        {hasPhoto && (
          <Button
            label="Remove Photo"
            variant="ghost"
            size="sm"
            disabled={disabled || picking}
            className="mt-2"
            leadingIcon={<Icon name="Trash2" size={15} color="#EF4444" />}
            labelClassName="text-urgency-critical"
            onPress={onRemove}
          />
        )}
      </View>
    </View>
  );
}
