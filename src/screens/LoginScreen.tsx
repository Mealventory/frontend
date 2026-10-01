import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@/src/components/atoms/Icon";
import { FigmaScreen, useInventory } from "@/src/context/InventoryContext";

export interface LoginScreenProps {
  onNavigate: (screen: FigmaScreen) => void;
}

export function LoginScreen({ onNavigate }: LoginScreenProps) {
  const { login } = useInventory();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [focused, setFocused] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleAuth = () => {
    login(email.trim() || undefined);
    onNavigate("home");
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-surface dark:bg-ground-canvas">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View className="bg-brand-50 dark:bg-brand-500/10 px-8 pt-10 pb-8 items-center rounded-b-[36px] mb-6">
          <View className="w-[72px] h-[72px] rounded-[24px] overflow-hidden shadow-md shadow-brand-500/20 mb-3.5 border border-border-default">
            <Image source={require("../../assets/branding/icon.png")} className="w-[72px] h-[72px]" resizeMode="cover" />
          </View>
          <Text className="text-[26px] font-bold text-text-primary tracking-tight">
            Mealventory
          </Text>
          <Text className="text-[14px] text-text-muted mt-0.5">
            Track your food, waste less.
          </Text>
        </View>

        {/* Body Form */}
        <View className="px-6 gap-3.5">
          {/* Sign In / Sign Up Toggle */}
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

          {/* Email Input */}
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

          {/* Password Input */}
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
              <TouchableOpacity activeOpacity={0.7} className="self-end pt-1">
                <Text className="text-[13px] font-semibold text-brand-500">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAuth}
            className="h-[54px] rounded-[18px] bg-brand-500 items-center justify-center shadow-md shadow-brand-500/30 mt-1"
          >
            <Text className="text-[16px] font-bold text-white tracking-wide">
              {mode === "login" ? "Sign In" : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center my-2 gap-3">
            <View className="flex-1 h-[1px] bg-border-default" />
            <Text className="text-[12px] text-text-subtle font-medium">or</Text>
            <View className="flex-1 h-[1px] bg-border-default" />
          </View>

          {/* Social Sign In */}
          <View className="flex-row gap-2.5">
            {/* Google */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAuth}
              className="flex-1 h-[50px] rounded-[16px] bg-ground-surface dark:bg-ground-card border border-border-default items-center justify-center flex-row gap-2"
            >
              <Icon name="Globe" size={17} color="#4285F4" />
              <Text className="text-[14px] font-bold text-text-primary">
                Google
              </Text>
            </TouchableOpacity>

            {/* Apple */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleAuth}
              className="flex-1 h-[50px] rounded-[16px] bg-ground-dark dark:bg-ground-elevated items-center justify-center flex-row gap-2 border border-border-default"
            >
              <Icon name="Apple" size={17} color="#FFFFFF" />
              <Text className="text-[14px] font-bold text-white">Apple</Text>
            </TouchableOpacity>
          </View>

          {/* Username */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleAuth}
            className="h-[50px] rounded-[16px] bg-ground-surface dark:bg-ground-card border border-border-default items-center justify-center flex-row gap-2 mt-1"
          >
            <Icon name="User" size={17} color="#94A3B8" />
            <Text className="text-[14px] font-bold text-text-secondary">
              Continue with Username
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
