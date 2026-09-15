import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
} from "react-native";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "social";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends TouchableOpacityProps {
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
    "bg-brand-500 active:bg-brand-600 shadow-sm shadow-brand-500/30 border border-transparent",
  secondary:
    "bg-ground-subtle active:bg-ground-muted border border-border-default",
  outline:
    "bg-transparent border border-border-default active:bg-ground-subtle",
  ghost: "bg-transparent active:bg-ground-subtle border border-transparent",
  danger:
    "bg-urgency-critical active:opacity-90 shadow-sm shadow-urgency-critical/30 border border-transparent",
  social:
    "bg-ground-surface border border-border-default active:bg-ground-subtle shadow-sm",
};

const variantTextStyles: Record<ButtonVariant, string> = {
  primary: "text-white font-bold",
  secondary: "text-text-primary font-semibold",
  outline: "text-text-primary font-semibold",
  ghost: "text-text-secondary font-medium",
  danger: "text-white font-bold",
  social: "text-text-primary font-semibold",
};

const sizeButtonStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 rounded-lg",
  md: "h-12 px-5 rounded-xl",
  lg: "h-14 px-6 rounded-2xl",
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
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${sizeButtonStyles[size]} ${variantButtonStyles[variant]} ${
        isDisabled ? "opacity-50" : ""
      } ${className}`}
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
            className={`${sizeTextStyles[size]} ${variantTextStyles[variant]} ${labelClassName}`}
          >
            {label}
          </Text>
          {trailingIcon && <View className="ml-2.5">{trailingIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
}
