import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button, Icon } from "@/src/components/atoms";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <RoutePlaceholder
      title="Reset Password"
      category="Auth"
      routePath="/(auth)/forgot-password"
      description="Password reset screen triggering a Supabase password recovery email."
      iconName="Key"
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
        <Button
          label="Send Reset Link"
          variant="primary"
          onPress={() => router.replace("/(auth)/sign-in" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
