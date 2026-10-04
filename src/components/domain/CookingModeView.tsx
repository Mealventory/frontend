import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import type { Recipe } from "@/src/types";
import { Icon } from "@/src/components/atoms/Icon";
import {
  cancelCookingTimer,
  formatCookingTimer,
  readCookingSession,
  remainingTimerSeconds,
  saveCookingStep,
  startCookingTimer,
  suggestedTimerSeconds,
  type CookingTimerState,
} from "@/src/lib/cookingSession";

interface CookingModeViewProps {
  recipe: Recipe;
  onBack: () => void;
  onFinish: () => void;
}

export function CookingModeView({ recipe, onBack, onFinish }: CookingModeViewProps) {
  useKeepAwake();

  const stepCount = recipe.steps.length;
  const initialSession = useMemo(
    () => readCookingSession(recipe.id, stepCount),
    [recipe.id, stepCount]
  );
  const [stepIndex, setStepIndex] = useState(initialSession.stepIndex);
  const [timer, setTimer] = useState<CookingTimerState | null>(initialSession.timer);
  const [now, setNow] = useState(Date.now());

  const currentStep = recipe.steps[stepIndex] || "No instructions are available for this recipe.";
  const suggestedSeconds = suggestedTimerSeconds(currentStep);
  const remainingSeconds = timer ? remainingTimerSeconds(timer, now) : 0;
  const progress = stepCount > 0 ? ((stepIndex + 1) / stepCount) * 100 : 0;
  const isFirst = stepIndex <= 0;
  const isLast = stepCount <= 1 || stepIndex >= stepCount - 1;

  useEffect(() => {
    if (!timer) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      const nextNow = Date.now();
      setNow(nextNow);
      if (nextNow >= timer.endsAt) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.endsAt]);

  const goToStep = (nextIndex: number) => {
    if (!stepCount) return;
    const next = saveCookingStep(recipe.id, nextIndex, stepCount);
    setStepIndex(next.stepIndex);
  };

  const startTimer = () => {
    if (!suggestedSeconds) return;
    const nextTimer = startCookingTimer(
      recipe.id,
      stepIndex,
      suggestedSeconds,
      stepCount,
      Date.now()
    );
    setTimer(nextTimer);
    setNow(Date.now());
  };

  const cancelTimer = () => {
    cancelCookingTimer(recipe.id, stepCount);
    setTimer(null);
  };

  const finish = () => {
    onFinish();
  };

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} className="flex-1 bg-ground-canvas">
      <View className="flex-1 px-4 pt-3 pb-4">
        <View className="flex-row items-center gap-3 mb-5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to recipe"
            onPress={onBack}
            className="w-11 h-11 rounded-2xl border border-border-default bg-ground-surface items-center justify-center"
          >
            <Icon name="ArrowLeft" size={19} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text numberOfLines={1} className="text-[13px] text-text-muted">
              Cooking
            </Text>
            <Text numberOfLines={1} className="text-[18px] font-bold text-text-primary">
              {recipe.name}
            </Text>
          </View>
          <View className="px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/20 border border-brand-500/20">
            <Text className="text-[12px] font-bold text-brand-500">
              {stepCount ? `${stepIndex + 1} of ${stepCount}` : "No steps"}
            </Text>
          </View>
        </View>

        <View className="h-2 rounded-full bg-ground-subtle overflow-hidden mb-8">
          <View className="h-full bg-brand-500 rounded-full" style={{ width: `${progress}%` }} />
        </View>

        <View className="flex-1 justify-center">
          <View className="items-center mb-7">
            <View className="w-16 h-16 rounded-[22px] bg-brand-50 dark:bg-brand-500/15 border border-brand-500/20 items-center justify-center mb-5">
              <Text className="text-[32px]">{recipe.emoji}</Text>
            </View>
            <Text className="text-[12px] font-bold text-text-subtle uppercase tracking-widest mb-3">
              {stepCount ? `Step ${stepIndex + 1}` : "Instructions"}
            </Text>
            <Text
              accessibilityRole="text"
              className="text-[25px] font-bold text-text-primary text-center leading-9 px-2"
            >
              {currentStep}
            </Text>
          </View>

          {(timer || suggestedSeconds) && (
            <View className="rounded-[24px] bg-ground-card border border-border-default p-4 mb-6">
              {timer ? (
                <View className="gap-3">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Icon name="Timer" size={19} color={remainingSeconds === 0 ? "#10B981" : "#64748B"} />
                      <Text className="text-[14px] font-bold text-text-primary">
                        {remainingSeconds === 0
                          ? "Timer complete"
                          : timer.stepIndex === stepIndex
                            ? "Step timer"
                            : `Timer from step ${timer.stepIndex + 1}`}
                      </Text>
                    </View>
                    <Text
                      accessibilityLiveRegion="polite"
                      className={`text-[24px] font-bold ${remainingSeconds === 0 ? "text-brand-500" : "text-text-primary"}`}
                    >
                      {formatCookingTimer(remainingSeconds)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Cancel cooking timer"
                    onPress={cancelTimer}
                    className="min-h-[44px] rounded-xl border border-border-default items-center justify-center"
                  >
                    <Text className="text-[13px] font-semibold text-text-secondary">
                      {remainingSeconds === 0 ? "Dismiss Timer" : "Cancel Timer"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-text-primary">
                      Timed step
                    </Text>
                    <Text className="text-[12px] text-text-muted mt-0.5">
                      Start a timer without leaving cooking mode.
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Start ${formatCookingTimer(suggestedSeconds || 0)} cooking timer`}
                    onPress={startTimer}
                    className="min-h-[44px] px-4 rounded-xl bg-brand-500 flex-row items-center gap-2"
                  >
                    <Icon name="Timer" size={16} color="#FFFFFF" />
                    <Text className="text-white text-[13px] font-bold">
                      {formatCookingTimer(suggestedSeconds || 0)}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous cooking step"
              accessibilityState={{ disabled: isFirst }}
              disabled={isFirst}
              onPress={() => goToStep(stepIndex - 1)}
              className="flex-1 min-h-[56px] rounded-2xl border border-border-default bg-ground-surface items-center justify-center flex-row gap-2"
              style={{ opacity: isFirst ? 0.4 : 1 }}
            >
              <Icon name="ChevronLeft" size={19} />
              <Text className="text-[15px] font-bold text-text-primary">Previous</Text>
            </TouchableOpacity>

            {!isLast && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Next cooking step"
                onPress={() => goToStep(stepIndex + 1)}
                className="flex-1 min-h-[56px] rounded-2xl bg-brand-500 items-center justify-center flex-row gap-2"
              >
                <Text className="text-[15px] font-bold text-white">Next</Text>
                <Icon name="ChevronRight" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {isLast && (
            <View className="pt-3 mt-1 border-t border-border-default">
              <Text className="text-[12px] text-text-muted text-center mb-3">
                Finished every step? Review what you used before updating your pantry.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Finish meal"
                onPress={finish}
                className="min-h-[58px] rounded-2xl bg-brand-500 items-center justify-center flex-row gap-2"
              >
                <Icon name="CheckCircle2" size={20} color="#FFFFFF" />
                <Text className="text-[16px] font-bold text-white">Finish Meal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
