import { useState } from 'react';
import { View, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button, Icon, Typography } from "@/src/components/atoms";
import { supabase } from "@/src/lib/supabase";
import { accountClient } from "@/src/lib/account";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const redirectUrl =
        Platform.OS === "web" && typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : Linking.createURL("/reset-password");
      const { error: resetError } = await accountClient(supabase).auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (resetError) throw resetError;
      setNotice("Password recovery email sent! Check your inbox for instructions.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoutePlaceholder
      title="Reset Password"
      category="Auth"
      routePath="/(auth)/forgot-password"
      description="Enter your email to receive a secure password recovery link."
      iconName="Key"
    >
      <View className="gap-4">
        {notice && (
          <View className="p-4 rounded-xl bg-urgency-fresh-bg border border-urgency-fresh/30">
            <Typography variant="caption" color="fresh" className="font-semibold">
              {notice}
            </Typography>
          </View>
        )}
        {error && (
          <View className="p-4 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30">
            <Typography variant="caption" color="critical" className="font-semibold">
              {error}
            </Typography>
          </View>
        )}
        <FormField
          label="Email Address"
          placeholder="name@example.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError("");
          }}
          leadingIcon={<Icon name="Mail" size={18} color="#94A3B8" />}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button
          label={loading ? "Sending Link…" : "Send Reset Link"}
          variant="primary"
          disabled={loading || !email.trim()}
          onPress={handleResetPassword}
        />
        <Button
          label="Back to Sign In"
          variant="ghost"
          size="sm"
          onPress={() => router.replace("/" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
