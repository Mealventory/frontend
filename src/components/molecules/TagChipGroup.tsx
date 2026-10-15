import { ScrollView, TouchableOpacity, Text, View } from "react-native";

export interface TagChipGroupProps {
  tags: string[];
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  className?: string;
}

export function TagChipGroup({
  tags,
  selectedTag,
  onSelectTag,
  className = "",
}: TagChipGroupProps) {
  return (
    <View className={className}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
        className="flex-row"
      >
        {tags.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <TouchableOpacity
              key={tag}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={tag}
              activeOpacity={0.7}
              onPress={() => onSelectTag(tag)}
              className={`mr-2 min-h-[44px] items-center justify-center px-4 py-2 rounded-full border ${
                isSelected
                  ? "bg-brand-500 border-brand-500"
                  : "bg-ground-surface border-border-default"
              }`}
            >
              <Text
                className={`text-[13px] font-bold ${
                  isSelected ? "text-white" : "text-text-secondary"
                }`}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
