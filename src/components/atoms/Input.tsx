import React, { useState } from "react";
import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Text,
} from "react-native";
import { useAppTheme } from "@/src/context/ThemeContext";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  leadingIcon,
  trailingIcon,
  containerClassName = "",
  className = "",
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { isDark } = useAppTheme();

  return (
    <View className={`w-full ${containerClassName}`}>
      {label && (
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">
          {label}
        </Text>
      )}
      <View
        className={`flex-row items-center px-4 h-[52px] rounded-xl bg-ground-subtle border ${
          error
            ? "border-urgency-critical"
            : isFocused
            ? "border-brand-500 shadow-sm shadow-brand-500/10"
            : "border-border-default"
        }`}
      >
        {leadingIcon && <View className="mr-3">{leadingIcon}</View>}
        <TextInput
          placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`flex-1 text-[15px] font-regular text-text-primary ${className}`}
          style={[{ paddingVertical: 0 }, style]}
          {...props}
        />
        {trailingIcon && <View className="ml-2">{trailingIcon}</View>}
      </View>
      {error && (
        <Text className="text-[12px] font-medium text-urgency-critical mt-1 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}
