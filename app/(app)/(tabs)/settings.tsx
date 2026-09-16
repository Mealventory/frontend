import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useNavigation } from "expo-router";
import { Typography, Button, Icon, Badge, Input } from "@/src/components/atoms";
import { useAppTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { accountClient, signOutAccount, changePassword } from "@/src/lib/account";
import { useAuth } from "@/src/context/AuthContext";

export default function SettingsTabScreen() {
  const router = useRouter();
  const rootNavigation = useNavigation("/");
  const { colorScheme, isDark, toggleTheme } = useAppTheme();
  const { session, household } = useAuth();
  const [logoutError, setLogoutError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const [currentUsername, setCurrentUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const user = session?.user;
    const name = user?.user_metadata?.username || user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
    setCurrentUsername(name);
    setNewUsername(name);
  }, [session?.user]);

  const handleUpdateUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUsernameMsg({ type: "error", text: "Username cannot be empty." });
      return;
    }
    setUsernameLoading(true);
    setUsernameMsg(null);
    try {
      const { error } = await accountClient(supabase).auth.updateUser({
        data: { username: trimmed, display_name: trimmed },
      });
      if (error) throw error;
      setCurrentUsername(trimmed);
      setUsernameMsg({ type: "success", text: "Username updated successfully!" });
    } catch (err) {
      setUsernameMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update username." });
    } finally {
      setUsernameLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      setPasswordMsg({ type: "error", text: "Please enter a new password." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      await changePassword(supabase, newPassword, confirmPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: "Password updated successfully!" });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to update password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View className="mb-6">
          <Typography variant="h1">Settings</Typography>
          <Typography variant="caption" color="muted">
            Preferences, appearance & household management
          </Typography>
        </View>

        {/* Appearance Section */}
        <View className="p-5 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6">
          <Typography variant="h3" className="font-bold mb-1">
            Appearance
          </Typography>
          <Typography variant="caption" color="muted" className="mb-4">
            Current active theme:{" "}
            <Typography variant="caption" className="font-bold uppercase text-brand-500">
              {colorScheme}
            </Typography>
          </Typography>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={toggleTheme}
            className="flex-row items-center justify-between p-3.5 bg-ground-subtle rounded-xl border border-border-default"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/20 items-center justify-center">
                <Icon name={isDark ? "Moon" : "Sun"} size={18} color="#10B981" />
              </View>
              <View>
                <Typography variant="body" className="font-semibold">
                  {isDark ? "Dark Mode (Slate 950)" : "Light Mode (Alabaster)"}
                </Typography>
                <Typography variant="caption" color="muted">
                  Tap to toggle theme
                </Typography>
              </View>
            </View>
            <Badge label={isDark ? "Dark" : "Light"} variant="brand" />
          </TouchableOpacity>
        </View>

        {/* Profile & Security Section */}
        <View className="p-5 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6 gap-4">
          <Typography variant="h3" className="font-bold mb-1">
            Profile & Security
          </Typography>

          {/* Username Subsection */}
          <View className="gap-2">
            <Typography variant="caption" className="font-semibold text-text-secondary uppercase tracking-wider">
              Username
            </Typography>
            <Input
              placeholder="e.g. chef_pablo"
              value={newUsername}
              onChangeText={(val) => {
                setNewUsername(val);
                if (usernameMsg) setUsernameMsg(null);
              }}
              leadingIcon={<Icon name="User" size={16} color="#94A3B8" />}
            />
            {usernameMsg && (
              <Typography
                variant="caption"
                color={usernameMsg.type === "success" ? "fresh" : "critical"}
                className="font-medium mt-0.5"
              >
                {usernameMsg.text}
              </Typography>
            )}
            <Button
              label={usernameLoading ? "Saving…" : "Update Username"}
              size="sm"
              variant="outline"
              disabled={usernameLoading || !newUsername.trim() || newUsername.trim() === currentUsername}
              onPress={handleUpdateUsername}
              className="self-start mt-1"
            />
          </View>

          <View className="h-[1px] bg-border-default my-1" />

          {/* Password Subsection */}
          <View className="gap-2">
            <Typography variant="caption" className="font-semibold text-text-secondary uppercase tracking-wider">
              Change Password
            </Typography>
            <Input
              placeholder="New password (min. 6 characters)"
              value={newPassword}
              onChangeText={(val) => {
                setNewPassword(val);
                if (passwordMsg) setPasswordMsg(null);
              }}
              secureTextEntry
              leadingIcon={<Icon name="Lock" size={16} color="#94A3B8" />}
            />
            <Input
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={(val) => {
                setConfirmPassword(val);
                if (passwordMsg) setPasswordMsg(null);
              }}
              secureTextEntry
              leadingIcon={<Icon name="Lock" size={16} color="#94A3B8" />}
            />
            {passwordMsg && (
              <Typography
                variant="caption"
                color={passwordMsg.type === "success" ? "fresh" : "critical"}
                className="font-medium mt-0.5"
              >
                {passwordMsg.text}
              </Typography>
            )}
            <Button
              label={passwordLoading ? "Updating…" : "Update Password"}
              size="sm"
              variant="outline"
              disabled={passwordLoading || !newPassword || !confirmPassword}
              onPress={handleUpdatePassword}
              className="self-start mt-1"
            />
          </View>
        </View>

        {/* Household Section */}
        <View className="p-5 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6 gap-3">
          <Typography variant="h3" className="font-bold mb-1">
            {household?.name || 'Household'}
          </Typography>
          <Button
            label="Manage Members"
            variant="outline"
            leadingIcon={<Icon name="Users" size={16} />}
            onPress={() => router.push("/(app)/household/members" as any)}
          />
          <Button
            label="Storage Zones (Pantry, Fridge, Freezer)"
            variant="outline"
            leadingIcon={<Icon name="Folder" size={16} />}
            onPress={() => router.push("/(app)/household/storage-zones" as any)}
          />
        </View>

        {/* Account Section */}
        <View className="p-5 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6 gap-3">
          <Typography variant="h3" className="font-bold mb-1">
            Account & Session
          </Typography>
          <Button
            label="Switch / Manage Households"
            variant="outline"
            leadingIcon={<Icon name="Home" size={16} />}
            onPress={() => {
              if (router.canDismiss()) {
                router.dismissAll();
              } else {
                try {
                  rootNavigation.navigate("index" as never);
                } catch {
                  router.replace("/" as any);
                }
              }
            }}
          />
          {!!logoutError && <Typography color="critical">{logoutError}</Typography>}
          <Button
            label={loggingOut ? 'Signing out…' : 'Log Out'}
            disabled={loggingOut}
            variant="danger"
            leadingIcon={<Icon name="LogOut" size={16} />}
            onPress={async () => {
              setLoggingOut(true); setLogoutError('');
              try {
                await signOutAccount(supabase);
                router.replace('/');
              } catch (e) {
                setLogoutError(e instanceof Error ? e.message : 'Could not sign out. Please try again.');
              } finally { setLoggingOut(false); }
            }}
          />
        </View>

        <Button
          label="View Design System Showcase"
          variant="secondary"
          leadingIcon={<Icon name="Layers" size={16} />}
          onPress={() => router.push("/prototype" as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
