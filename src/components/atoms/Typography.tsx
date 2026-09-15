import React from "react";
import { Text, TextProps } from "react-native";

export type TypographyVariant = "h1" | "h2" | "h3" | "body" | "caption" | "tiny";
export type TypographyColor =
  | "primary"
  | "secondary"
  | "muted"
  | "subtle"
  | "brand"
  | "critical"
  | "soon"
  | "fresh"
  | "inverse";

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<TypographyVariant, string> = {
  h1: "text-[32px] leading-[38px] font-bold tracking-tight font-bold",
  h2: "text-[24px] leading-[30px] font-bold tracking-tight font-bold",
  h3: "text-[18px] leading-[24px] font-semibold tracking-normal font-semibold",
  body: "text-[15px] leading-[22px] font-normal font-regular",
  caption: "text-[12px] leading-[16px] font-medium font-regular",
  tiny: "text-[10px] leading-[14px] font-bold tracking-wider uppercase font-bold",
};

const colorStyles: Record<TypographyColor, string> = {
  primary: "text-text-primary",
  secondary: "text-text-secondary",
  muted: "text-text-muted",
  subtle: "text-text-subtle",
  brand: "text-brand-500",
  critical: "text-urgency-critical",
  soon: "text-urgency-soon",
  fresh: "text-urgency-fresh",
  inverse: "text-text-inverse",
};

export function Typography({
  variant = "body",
  color = "primary",
  className = "",
  children,
  style,
  ...props
}: TypographyProps) {
  const variantClass = variantStyles[variant];
  const colorClass = colorStyles[color];

  return (
    <Text
      className={`${variantClass} ${colorClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}
