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
  leadingActions?: SwipeAction[];
  disabled?: boolean;
  testIDPrefix?: string;
  containerClassName?: string;
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
  leadingActions = [],
  disabled = false,
  testIDPrefix = "swipe",
  containerClassName = "",
}: SwipeActionRowProps) {
  const trailingWidth = actions.length * ACTION_WIDTH;
  const leadingWidth = leadingActions.length * ACTION_WIDTH;
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
  const openTrailing = () => animateTo(-trailingWidth);
  const openLeading = () => animateTo(leadingWidth);

  useEffect(() => {
    if (disabled) close();
  }, [disabled, leadingWidth, trailingWidth]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (
            disabled ||
            (actions.length === 0 && leadingActions.length === 0)
          ) {
            return false;
          }

          const horizontal = Math.abs(gesture.dx);
          const vertical = Math.abs(gesture.dy);
          if (
            horizontal <= HORIZONTAL_INTENT_PX ||
            horizontal <= vertical * 1.4
          ) {
            return false;
          }

          if (gesture.dx < 0) {
            return actions.length > 0 || currentX.current > 0;
          }
          if (gesture.dx > 0) {
            return leadingActions.length > 0 || currentX.current < 0;
          }
          return false;
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
            -trailingWidth,
            Math.min(leadingWidth, gestureStartX.current + gesture.dx)
          );
          currentX.current = next;
          translateX.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const openLeft =
            trailingWidth > 0 &&
            (currentX.current < -trailingWidth * OPEN_THRESHOLD ||
              gesture.vx < -0.45);
          const openRight =
            leadingWidth > 0 &&
            (currentX.current > leadingWidth * OPEN_THRESHOLD ||
              gesture.vx > 0.45);

          if (openLeft) openTrailing();
          else if (openRight) openLeading();
          else close();
        },
        onPanResponderTerminate: close,
        onShouldBlockNativeResponder: () => false,
      }),
    [
      actions.length,
      disabled,
      leadingActions.length,
      leadingWidth,
      trailingWidth,
    ]
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

  const renderActions = (
    rows: SwipeAction[],
    side: "left" | "right",
    width: number
  ) => (
    <View
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        width,
        flexDirection: "row",
        ...(side === "left" ? { left: 0 } : { right: 0 }),
      }}
    >
      {rows.map((action) => {
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
  );

  return (
    <View className={`overflow-hidden ${containerClassName}`}>
      {leadingWidth > 0 && renderActions(leadingActions, "left", leadingWidth)}
      {trailingWidth > 0 && renderActions(actions, "right", trailingWidth)}

      <Animated.View
        {...responder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
