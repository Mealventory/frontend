import { useState } from 'react';
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules";
import { Button, Icon, Typography } from "@/src/components/atoms";
import { supabase } from "@/src/lib/supabase";
import {
  validateSignUp,
  signUpAccount,
  SignUpValidationErrors,
} from "@/src/lib/account";

export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignUpValidationErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleSignUp = async () => {
    if (busy) return;

    const validation = validateSignUp({
      displayName,
      email,
      password,
      confirmPassword,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await signUpAccount(supabase, {
        displayName,
        email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.data.session) {
        router.replace("/(onboarding)/household-choice" as any);
      } else {
        setNotice(
          "Account created! Please check your email to confirm your account, then sign in."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create account. Please check your details and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <RoutePlaceholder
      title="Create Account"
      category="Auth"
      routePath="/(auth)/sign-up"
      description="Join Mealventory to share ingredients, plan meals, and cut kitchen waste."
      iconName="UserPlus"
    >
      <View className="gap-4">
        {notice ? (
          <View className="p-4 rounded-xl bg-urgency-fresh-bg border border-urgency-fresh/30">
            <Typography
              variant="caption"
              color="fresh"
              className="font-semibold"
            >
              {notice}
            </Typography>
          </View>
        ) : null}

        {error ? (
          <View className="p-4 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30">
            <Typography
              variant="caption"
              color="critical"
              className="font-semibold"
            >
              {error}
            </Typography>
          </View>
        ) : null}

        <FormField
          label="Display Name"
          placeholder="e.g. Chef Pablo"
          value={displayName}
          onChangeText={(text) => {
            setDisplayName(text);
            if (fieldErrors.displayName) {
              setFieldErrors((prev) => ({ ...prev, displayName: undefined }));
            }
            if (error) setError("");
          }}
          leadingIcon={<Icon name="User" size={18} color="#94A3B8" />}
          autoCapitalize="words"
          error={fieldErrors.displayName}
          required
        />

        <FormField
          label="Email Address"
          placeholder="name@example.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (fieldErrors.email) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
            if (error) setError("");
          }}
          leadingIcon={<Icon name="Mail" size={18} color="#94A3B8" />}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          error={fieldErrors.email}
          required
        />

        <FormField
          label="Password"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (fieldErrors.password) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
            if (error) setError("");
          }}
          leadingIcon={<Icon name="Lock" size={18} color="#94A3B8" />}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={fieldErrors.password}
          required
        />

        <FormField
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (fieldErrors.confirmPassword) {
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }
            if (error) setError("");
          }}
          leadingIcon={<Icon name="Lock" size={18} color="#94A3B8" />}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          required
        />

        <Button
          label={busy ? "Creating Account..." : "Create Account"}
          variant="primary"
          disabled={busy}
          onPress={handleSignUp}
        />

        <Button
          label="Already have an account? Sign in"
          variant="ghost"
          size="sm"
          onPress={() => router.push("/(auth)/sign-in" as any)}
        />
      </View>
    </RoutePlaceholder>
  );
}
