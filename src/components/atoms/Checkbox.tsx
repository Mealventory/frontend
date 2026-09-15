import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { Icon } from "./Icon";

export interface CheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  disabled = false,
  className = "",
}: CheckboxProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => onToggle(!checked)}
      className={`flex-row items-center ${disabled ? "opacity-50" : ""} ${className}`}
    >
      <View
        className={`w-5 h-5 rounded-md items-center justify-center border ${
          checked
            ? "bg-brand-500 border-brand-500"
            : "bg-ground-surface border-border-default"
        }`}
      >
        {checked && <Icon name="Check" size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>
      {label && (
        <Text
          className={`ml-2.5 text-[14px] font-medium ${
            checked
              ? "text-text-muted line-through"
              : "text-text-primary"
          }`}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
