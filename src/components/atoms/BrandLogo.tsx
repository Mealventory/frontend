import React from 'react';
import { Image, View } from 'react-native';

/** Display the original artwork in a compact viewport without stretching it. */
export function BrandLogo({ width = 132, hero = false }: { width?: number; hero?: boolean }) {
  // The supplied square artwork includes generous margins; frame its wordmark
  // for headers and its complete illustration for welcome screens.
  const scale = width / 1080;
  const top = hero ? 240 : 825;
  const height = (hero ? 790 : 200) * scale;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Mealventory"
      style={{ width, height, overflow: 'hidden', backgroundColor: '#F6F8F4', borderRadius: 10 }}>
      <Image source={require('../../../assets/branding/mealventory-logo.png')}
        accessible={false} resizeMode="contain"
        style={{ position: 'absolute', width: 1254 * scale, height: 1254 * scale, left: -90 * scale, top: -top * scale }} />
    </View>
  );
}
