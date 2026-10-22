import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeContext';
import { Icon } from '../atoms/Icon';

const options = [
  { id: 'system', label: 'System', icon: 'Smartphone' },
  { id: 'light', label: 'Light', icon: 'Sun' },
  { id: 'dark', label: 'Dark', icon: 'Moon' },
] as const;

export function ThemeSelector() {
  const { themePreference, isDark, setThemePreference } = useAppTheme();
  return <View>
    <View style={[styles.track, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' }]}>
      {options.map(option => {
        const selected = option.id === themePreference;
        const color = selected ? '#FFFFFF' : isDark ? '#CBD5E1' : '#475569';
        return <TouchableOpacity key={option.id} activeOpacity={0.75} accessibilityRole="radio"
          accessibilityLabel={`${option.label} appearance`} accessibilityState={{ checked: selected }}
          onPress={() => { void setThemePreference(option.id); }}
          style={[styles.option, { backgroundColor: selected ? '#059669' : 'transparent' }]}>
          <Icon name={option.icon} size={16} color={color} />
          <Text style={[styles.label, { color }]}>{option.label}</Text>
        </TouchableOpacity>;
      })}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 4, borderWidth: 1, borderRadius: 14, gap: 4 },
  option: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 10, borderRadius: 10, gap: 6 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
