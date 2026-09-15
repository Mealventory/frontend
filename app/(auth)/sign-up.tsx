import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button, Icon } from "@/src/components/atoms";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <RoutePlaceholder
      title="Create Account"
      category="Auth"
      routePath="/(auth)/sign-up"
      description="Registration screen for new users before joining or creating a household unit."
      iconName="UserPlus"
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
          placeholder="Create a strong password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leadingIcon={<Icon name="Lock" size={18} color="#94A3B8" />}
        />
        <Button
          label="Create Account"
          variant="primary"
          onPress={() => router.replace("/(onboarding)/household-choice" as any)}
        />
        <Button
          label="Already have an account? Sign In"
          variant="ghost"
          size="sm"
          onPress={() => router.push("/(auth)/sign-in" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
