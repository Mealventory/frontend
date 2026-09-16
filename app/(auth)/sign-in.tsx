import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button, Icon } from "@/src/components/atoms";
import { supabase } from "@/src/lib/supabase";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async () => {
    if (!supabase || busy || !email.trim() || !password) return;
    setBusy(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      router.replace("/" as any);
    } catch (err: any) {
      setError(err?.message || "Could not sign in. Check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoutePlaceholder
      title="Sign In"
      category="Auth"
      routePath="/(auth)/sign-in"
      description="Authenticate via Supabase Auth (Email & Password)."
      iconName="LogIn"
    >
      <View className="gap-4">
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

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
          label={busy ? "Signing in..." : "Sign In to Kitchen"}
          variant="primary"
          disabled={busy || !email.trim() || !password}
          onPress={handleSignIn}
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

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
  },
});
