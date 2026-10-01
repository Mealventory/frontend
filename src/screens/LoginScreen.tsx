import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/src/components/atoms/Icon";
import {
  useInventory,
  FigmaScreen,
} from "@/src/context/InventoryContext";

export interface LoginScreenProps {
  onNavigate: (screen: FigmaScreen) => void;
}

export function LoginScreen({ onNavigate }: LoginScreenProps) {
  const router = useRouter();
  const { login, signup } = useInventory();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [focused, setFocused] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      Alert.alert(
        "Missing information",
        "Please enter your email and password.",
      );
      return;
    }

    if (mode === "signup" && password.length < 6) {
      Alert.alert(
        "Password too short",
        "Your password must be at least 6 characters.",
      );
      return;
    }

    try {
      setSubmitting(true);

      if (mode === "login") {
        const result = await login(trimmedEmail, password);

        if (result.hasHousehold) {
          onNavigate("home");
        } else {
          router.replace("/(onboarding)/household-choice" as any);
        }
      } else {
        const result = await signup(trimmedEmail, password);

        if (result.emailConfirmationRequired) {
          Alert.alert(
            "Check your email",
            "Your account was created. Please verify your email before signing in.",
          );
          setMode("login");
          return;
        }

        if (result.hasHousehold) {
          onNavigate("home");
        } else {
          router.replace("/(onboarding)/household-choice" as any);
        }
      }
    } catch (error) {
      Alert.alert(
        mode === "login" ? "Sign in failed" : "Sign up failed",
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-surface dark:bg-ground-canvas">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-brand-50 dark:bg-brand-500/10 px-8 pt-10 pb-8 items-center rounded-b-[36px] mb-6">
          <View className="w-[72px] h-[72px] rounded-[24px] bg-ground-surface dark:bg-ground-elevated items-center justify-center shadow-md shadow-brand-500/20 mb-3.5 border border-border-default">
            <Text className="text-4xl">🥦</Text>
          </View>

          <Text className="text-[26px] font-bold text-text-primary tracking-tight">
            Mealventory
          </Text>

          <Text className="text-[14px] text-text-muted mt-0.5">
            Track your food, waste less.
          </Text>
        </View>

        <View className="px-6 gap-3.5">
          <View className="flex-row bg-ground-subtle dark:bg-ground-elevated rounded-[16px] p-1 gap-1 border border-border-default">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setMode("login")}
              className={`flex-1 h-[38px] rounded-[12px] items-center justify-center ${
                mode === "login"
                  ? "bg-ground-surface dark:bg-ground-card"
                  : ""
              }`}
            >
              <Text
                className={`text-[14px] font-bold ${
                  mode === "login" ? "text-text-primary" : "text-text-muted"
                }`}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setMode("signup")}
              className={`flex-1 h-[38px] rounded-[12px] items-center justify-center ${
                mode === "signup"
                  ? "bg-ground-surface dark:bg-ground-card"
                  : ""
              }`}
            >
              <Text
                className={`text-[14px] font-bold ${
                  mode === "signup" ? "text-text-primary" : "text-text-muted"
                }`}
              >
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          <View
            className={`flex-row items-center px-4 h-[52px] rounded-[16px] bg-ground-subtle dark:bg-ground-elevated border ${
              focused === "email"
                ? "border-brand-500"
                : "border-border-default"
            }`}
          >
            <Icon
              name="Mail"
              size={18}
              color={focused === "email" ? "#10B981" : "#94A3B8"}
            />

            <TextInput
              placeholder="Email address"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              className="flex-1 ml-2.5 text-[15px] text-text-primary"
            />
          </View>

          <View className="gap-1.5">
            <View
              className={`flex-row items-center px-4 h-[52px] rounded-[16px] bg-ground-subtle dark:bg-ground-elevated border ${
                focused === "pw"
                  ? "border-brand-500"
                  : "border-border-default"
              }`}
            >
              <Icon
                name="Lock"
                size={18}
                color={focused === "pw" ? "#10B981" : "#94A3B8"}
              />

              <TextInput
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                onFocus={() => setFocused("pw")}
                onBlur={() => setFocused(null)}
                className="flex-1 ml-2.5 text-[15px] text-text-primary"
              />
            </View>

            {mode === "login" && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push("/(auth)/forgot-password" as any)
                }
                className="self-end pt-1"
              >
                <Text className="text-[13px] font-semibold text-brand-500">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={submitting}
            onPress={handleAuth}
            className="h-[54px] rounded-[18px] bg-brand-500 items-center justify-center shadow-md shadow-brand-500/30 mt-1"
          >
            <Text className="text-[16px] font-bold text-white tracking-wide">
              {submitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}