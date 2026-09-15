import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button, Icon } from "@/src/components/atoms";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <RoutePlaceholder
      title="Sign In"
      category="Auth"
      routePath="/(auth)/sign-in"
      description="Authentication screen allowing existing household users to authenticate via Supabase Auth (Email or OAuth)."
      iconName="LogIn"
    >
      <View className="gap-4">
        <FormField
          label="Email Address"
          placeholder="name@example.com"
          value={email}
          onChangeText={setEmail}
          leadingIcon={<Icon name="Mail" size={18} color="#94A3B8" />}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <FormField
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leadingIcon={<Icon name="Lock" size={18} color="#94A3B8" />}
        />
        <Button
          label="Sign In to Kitchen"
          variant="primary"
          onPress={() => router.replace("/(app)/(tabs)" as any)}
        />
        <Button
          label="Forgot Password?"
          variant="ghost"
          size="sm"
          onPress={() => router.push("/(auth)/forgot-password" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
