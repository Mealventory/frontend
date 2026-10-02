import React, { useState } from "react";
import {
  View,
  TextInput,
  TextInputProps,
  Text,
  StyleSheet,
} from "react-native";

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
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`w-full ${containerClassName}`}>
      {label && (
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">
          {label}
        </Text>
      )}
      <View
        className={`bg-ground-input ${error ? "border-urgency-critical" : isFocused ? "border-brand-500" : "border-border-default"}`}
        style={styles.inputContainer}
      >
        {leadingIcon && <View style={styles.leadingIcon}>{leadingIcon}</View>}
        <TextInput
          placeholderTextColor="#94A3B8"
          onFocus={(event) => { setIsFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setIsFocused(false); onBlur?.(event); }}
          className={`flex-1 text-[15px] font-regular text-text-primary ${className}`}
          style={[{ paddingVertical: 0 }, style]}
          {...props}
        />
        {trailingIcon && <View style={styles.trailingIcon}>{trailingIcon}</View>}
      </View>
      {error && (
        <Text className="text-[12px] font-medium text-urgency-critical mt-1 ml-1">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    minHeight: 52,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  leadingIcon: {
    marginRight: 12,
  },
  trailingIcon: {
    marginLeft: 8,
  },
});
