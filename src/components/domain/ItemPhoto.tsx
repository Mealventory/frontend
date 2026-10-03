import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { resolveItemPhotoUrl } from "@/src/lib/itemPhotoStorage";

export function ItemPhoto({
  imageRef,
  emoji,
  name,
  size = 46,
  borderRadius = 16,
  emojiSize,
}: {
  imageRef?: string | null;
  emoji: string;
  name?: string;
  size?: number;
  borderRadius?: number;
  emojiSize?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setUrl(null);
    void resolveItemPhotoUrl(imageRef).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [imageRef]);

  return (
    <View
      className="shrink-0 bg-ground-subtle dark:bg-ground-elevated items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius }}
    >
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          resizeMode="cover"
          accessibilityLabel={name ? `${name} photo` : "Item photo"}
          onError={() => setFailed(true)}
          style={{ width: size, height: size }}
        />
      ) : (
        <Text style={{ fontSize: emojiSize ?? Math.max(20, Math.round(size * 0.5)) }}>
          {emoji}
        </Text>
      )}
    </View>
  );
}
