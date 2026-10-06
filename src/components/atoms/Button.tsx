import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  PressableProps,
} from "react-native";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "social";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends PressableProps {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  className?: string;
  labelClassName?: string;
}

const variantButtonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 active:bg-brand-600 border border-transparent",
  secondary:
    "bg-ground-subtle active:bg-ground-muted border border-border-default",
  outline:
    "bg-transparent border border-border-default active:bg-ground-subtle",
  ghost: "bg-transparent active:bg-ground-subtle border border-transparent",
  danger:
    "bg-urgency-critical active:opacity-90 border border-transparent",
  social:
    "bg-ground-surface border border-border-default active:bg-ground-subtle",
};

// Native shadow styles avoid introducing CSS variables when selection changes.
const selectedShadow = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05, shadowRadius: 1, elevation: 1,
};
const noShadow = { shadowOpacity: 0, shadowRadius: 0, elevation: 0 };

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: "text-white font-bold",
  secondary: "text-text-primary font-semibold",
  outline: "text-text-primary font-semibold",
  ghost: "text-text-secondary font-medium",
  danger: "text-white font-bold",
  social: "text-text-primary font-semibold",
};

const sizeButtonStyles: Record<ButtonSize, string> = {
  sm: "min-h-[44px] py-2 px-3.5 rounded-lg",
  md: "min-h-[48px] py-3 px-5 rounded-xl",
  lg: "min-h-[56px] py-3.5 px-6 rounded-2xl",
};

const sizeTextStyles: Record<ButtonSize, string> = {
  sm: "text-[13px]",
  md: "text-[15px]",
  lg: "text-[16px]",
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  leadingIcon,
  trailingIcon,
  className = "",
  labelClassName = "",
  disabled,
  style,
  accessibilityLabel,
  accessibilityState,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{
        ...accessibilityState,
        disabled: Boolean(isDisabled),
        busy: loading,
      }}
      disabled={isDisabled}
      style={state => [typeof style === "function" ? style(state) : style, { opacity: isDisabled ? 0.5 : state.pressed ? 0.8 : 1 }, ["primary", "danger", "social"].includes(variant) ? selectedShadow : noShadow]}
      className={`flex-row items-center justify-center ${sizeButtonStyles[size]} ${variantButtonStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#FFFFFF" : "#10B981"}
        />
      ) : (
        <>
          {leadingIcon && <View className="mr-2.5">{leadingIcon}</View>}
          <Text
            className={`text-center flex-shrink ${sizeTextStyles[size]} ${variantTextStyles[variant]} ${labelClassName}`}
          >
            {label}
          </Text>
          {trailingIcon && <View className="ml-2.5">{trailingIcon}</View>}
        </>
      )}
    </Pressable>
  );
}
