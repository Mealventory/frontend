import React from "react";
import { View, Text } from "react-native";
import { Input, InputProps } from "../atoms/Input";
import { Typography } from "../atoms/Typography";

export interface FormFieldProps extends InputProps {
  label: string;
  helperText?: string;
  required?: boolean;
}

export function FormField({
  label,
  helperText,
  error,
  required = false,
  containerClassName = "",
  ...props
}: FormFieldProps) {
  return (
    <View className={`w-full ${containerClassName}`}>
      <View className="flex-row items-center mb-1.5 ml-1">
        <Typography variant="caption" className="font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </Typography>
        {required && (
          <Text className="text-urgency-critical ml-1 text-xs font-bold">*</Text>
        )}
      </View>
      <Input accessibilityLabel={label} error={error} {...props} />
      {helperText && !error && (
        <Typography variant="caption" color="muted" className="mt-2 ml-1">
          {helperText}
        </Typography>
      )}
    </View>
  );
}
