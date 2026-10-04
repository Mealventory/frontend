import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type SwipeActionTone = "primary" | "danger" | "neutral";

export interface SwipeAction {
  key: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void | Promise<void>;
  tone?: SwipeActionTone;
  disabled?: boolean;
}

interface SwipeActionRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  disabled?: boolean;
  testIDPrefix?: string;
}

const ACTION_WIDTH = 88;
const HORIZONTAL_INTENT_PX = 8;
const OPEN_THRESHOLD = 0.32;

function actionClasses(tone: SwipeActionTone) {
  if (tone === "danger") return "bg-urgency-critical";
  if (tone === "neutral") return "bg-ground-subtle";
  return "bg-brand-500";
}

function textClasses(tone: SwipeActionTone) {
  return tone === "neutral" ? "text-text-primary" : "text-white";
}

export function SwipeActionRow({
  children,
  actions,
  disabled = false,
  testIDPrefix = "swipe",
}: SwipeActionRowProps) {
  const revealWidth = Math.max(1, actions.length) * ACTION_WIDTH;
  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const gestureStartX = useRef(0);
  const actionLocked = useRef(false);

  const animateTo = (value: number) => {
    currentX.current = value;
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      damping: 24,
      stiffness: 260,
      mass: 0.8,
    }).start();
  };

  const close = () => animateTo(0);
  const open = () => animateTo(-revealWidth);

  useEffect(() => {
    if (disabled) close();
  }, [disabled, revealWidth]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (disabled || actions.length === 0) return false;
          const horizontal = Math.abs(gesture.dx);
          const vertical = Math.abs(gesture.dy);
          const headingTowardActions =
            gesture.dx < 0 || (currentX.current < 0 && gesture.dx > 0);
          return (
            headingTowardActions &&
            horizontal > HORIZONTAL_INTENT_PX &&
            horizontal > vertical * 1.4
          );
        },
        onPanResponderGrant: () => {
          gestureStartX.current = currentX.current;
          translateX.stopAnimation((value) => {
            currentX.current = value;
            gestureStartX.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(
            -revealWidth,
            Math.min(0, gestureStartX.current + gesture.dx)
          );
          currentX.current = next;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldOpen =
            currentX.current < -revealWidth * OPEN_THRESHOLD ||
            gesture.vx < -0.45;
          if (shouldOpen) open();
          else close();
        },
        onPanResponderTerminate: close,
        onShouldBlockNativeResponder: () => false,
      }),
    [actions.length, disabled, revealWidth]
  );

  const invoke = async (action: SwipeAction) => {
    if (disabled || action.disabled || actionLocked.current) return;
    actionLocked.current = true;
    close();
    try {
      await action.onPress();
    } finally {
      actionLocked.current = false;
    }
  };

  return (
    <View className="overflow-hidden">
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: revealWidth,
          flexDirection: "row",
        }}
      >
        {actions.map((action) => {
          const tone = action.tone ?? "primary";
          const actionDisabled = disabled || action.disabled;
          return (
            <TouchableOpacity
              key={action.key}
              testID={`${testIDPrefix}-${action.key}`}
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
              accessibilityState={{ disabled: Boolean(actionDisabled) }}
              activeOpacity={0.75}
              disabled={actionDisabled}
              onPress={() => void invoke(action)}
              className={`flex-1 items-center justify-center px-2 ${actionClasses(
                tone
              )} ${actionDisabled ? "opacity-50" : ""}`}
            >
              <Text
                numberOfLines={2}
                className={`text-xs font-bold text-center ${textClasses(tone)}`}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Animated.View
        {...responder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
