import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Badge, Avatar, Button, Icon } from "@/src/components/atoms";
import { MemberDetailSheet } from "@/src/components/domain/MemberDetailSheet";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import {
  getHouseholdMembers,
  updateHouseholdMemberRole,
  removeHouseholdMember,
  HouseholdRole,
  Member,
} from "@/src/lib/householdApi";
import {
  resolveMemberList,
  MemberProfile,
  formatRole,
} from "@/src/lib/memberProfiles";

type RoleFilter = "all" | "owner" | "admin" | "member";

export default function HouseholdMembersScreen() {
  const router = useRouter();
  const { session, household } = useAuth();

  const [rawMembers, setRawMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState<RoleFilter>("all");
  const [copiedCode, setCopiedCode] = useState(false);

  const getAccessToken = useCallback(async (): Promise<string> => {
    if (session?.access_token) return session.access_token;
    if (supabase) {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw new Error("Your sign-in session expired. Sign in again to view household members.");
      }
      return data.session.access_token;
    }
    throw new Error("Sign-in is not configured yet.");
  }, [session]);

  const loadMembers = useCallback(async (isRefresh = false) => {
    if (!household?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const rows = await getHouseholdMembers(household.id, token);
      setRawMembers(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load household members. Please retry."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [household?.id, getAccessToken]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Convert raw members to enhanced MemberProfile objects
  const resolvedMembers = useMemo(() => {
    return resolveMemberList(rawMembers, session);
  }, [rawMembers, session]);

  // Determine current user's role in this household
  const currentUserRole: HouseholdRole = useMemo(() => {
    if (household?.role) return household.role;
    const me = resolvedMembers.find((m) => m.isCurrentUser);
    return me?.role || "member";
  }, [household?.role, resolvedMembers]);

  // Filter members by role tab
  const filteredMembers = useMemo(() => {
    if (activeFilter === "all") return resolvedMembers;
    return resolvedMembers.filter((m) => m.role === activeFilter);
  }, [resolvedMembers, activeFilter]);

  // Role counters for tabs
  const counts = useMemo(() => {
    const total = resolvedMembers.length;
    const owners = resolvedMembers.filter((m) => m.role === "owner").length;
    const admins = resolvedMembers.filter((m) => m.role === "admin").length;
    const membersOnly = resolvedMembers.filter((m) => m.role === "member").length;
    return { total, owners, admins, members: membersOnly };
  }, [resolvedMembers]);

  // Handle owner updating another member's role
  const handleUpdateRole = async (target: MemberProfile, newRole: HouseholdRole) => {
    if (!household?.id) throw new Error("No active household selected.");
    const token = await getAccessToken();
    const updated = await updateHouseholdMemberRole(household.id, target.userId, newRole, token);

    // Optimistically update list
    setRawMembers((prev) =>
      prev.map((m) => (m.user_id === target.userId ? { ...m, role: updated.role } : m))
    );

    // Keep selected member sheet updated
    setSelectedMember((prev) => (prev ? { ...prev, role: updated.role } : null));
    setNotice(`Updated ${target.displayName} to ${formatRole(newRole)}.`);
  };

  // Handle owner/admin removing a member
  const handleRemoveMember = async (target: MemberProfile) => {
    if (!household?.id) throw new Error("No active household selected.");
    const token = await getAccessToken();
    await removeHouseholdMember(household.id, target.userId, token);

    // Remove from local list
    setRawMembers((prev) => prev.filter((m) => m.user_id !== target.userId));
    setSelectedMember(null);
    setNotice(`Removed ${target.displayName} from household.`);
  };

  // Handle current user leaving household
  const handleLeaveHousehold = async (target: MemberProfile) => {
    if (!household?.id) throw new Error("No active household selected.");
    const token = await getAccessToken();
    await removeHouseholdMember(household.id, target.userId, token);

    setSelectedMember(null);
    if (router.canGoBack()) router.back();
    else router.replace("/(app)/household" as any);
  };

  // Quick invite code copy helper
  const handleCopyInviteCode = () => {
    if (!household?.invite_code) return;
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(household.invite_code).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-border-default bg-ground-canvas">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(app)/(tabs)/settings" as any);
          }}
          className="w-10 h-10 rounded-full bg-ground-surface dark:bg-ground-card border border-border-default items-center justify-center"
        >
          <Icon name="ArrowLeft" size={18} color="#10B981" />
        </Pressable>

        <View className="items-center flex-1 mx-2">
          <Typography variant="h3" className="font-bold text-center">
            Household Members
          </Typography>
          <Typography variant="caption" color="muted" className="text-center" numberOfLines={1}>
            {household?.name || "Kitchen Household"}
          </Typography>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh members"
          disabled={loading || refreshing}
          onPress={() => void loadMembers(true)}
          className="w-10 h-10 rounded-full bg-ground-surface dark:bg-ground-card border border-border-default items-center justify-center"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Icon name="RefreshCw" size={16} color="#10B981" />
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 60,
          width: "100%",
          maxWidth: 580,
          alignSelf: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadMembers(true)}
            colors={["#10B981"]}
            tintColor="#10B981"
          />
        }
      >
        {/* Notice Banner */}
        {notice ? (
          <View
            accessibilityLiveRegion="polite"
            className="p-3.5 mb-4 rounded-xl bg-urgency-fresh-bg border border-urgency-fresh/30 flex-row items-center gap-2"
          >
            <Icon name="Check" size={16} color="#059669" />
            <Typography variant="caption" className="text-urgency-fresh flex-1">
              {notice}
            </Typography>
            <Pressable onPress={() => setNotice(null)}>
              <Icon name="X" size={14} color="#059669" />
            </Pressable>
          </View>
        ) : null}

        {/* Error Banner */}
        {error ? (
          <View
            accessibilityRole="alert"
            className="p-4 mb-5 rounded-2xl bg-urgency-critical-bg border border-urgency-critical/30 gap-2"
          >
            <View className="flex-row items-center gap-2">
              <Icon name="AlertCircle" size={18} color="#DC2626" />
              <Typography variant="body" className="font-bold text-urgency-critical flex-1">
                Unable to load members
              </Typography>
            </View>
            <Typography variant="caption" className="text-urgency-critical">
              {error}
            </Typography>
            <Button
              label="Retry"
              variant="outline"
              size="sm"
              onPress={() => void loadMembers()}
              className="mt-1 self-start"
            />
          </View>
        ) : null}

        {/* Household Overview & Invite Code Card */}
        {household && (
          <View className="p-5 bg-ground-surface dark:bg-ground-card rounded-2xl border border-border-default shadow-sm mb-5">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2.5">
                <View className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/20 items-center justify-center">
                  <Icon name="Home" size={18} color="#10B981" />
                </View>
                <View>
                  <Typography variant="body" className="font-bold">
                    {household.name}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {counts.total} {counts.total === 1 ? "collaborator" : "collaborators"}
                  </Typography>
                </View>
              </View>

              <Badge
                label={`${formatRole(currentUserRole)}`}
                variant={currentUserRole === "owner" ? "brand" : "neutral"}
                size="sm"
              />
            </View>

            {/* Invite code block */}
            <View className="p-3.5 bg-ground-subtle dark:bg-ground-elevated rounded-xl border border-border-default flex-row items-center justify-between">
              <View>
                <Typography variant="tiny" color="muted">
                  HOUSEHOLD INVITE CODE
                </Typography>
                <Text
                  selectable
                  className="text-lg font-bold tracking-widest text-text-primary mt-0.5 font-mono"
                >
                  {household.invite_code || "------"}
                </Text>
              </View>

              {household.invite_code && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy household invite code"
                  onPress={handleCopyInviteCode}
                  className="flex-row items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-50 dark:bg-brand-500/20 border border-brand-500/30"
                >
                  <Icon
                    name={copiedCode ? "Check" : "Copy"}
                    size={14}
                    color="#10B981"
                  />
                  <Text className="text-xs font-semibold text-brand-500">
                    {copiedCode ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Role Filter Tabs */}
        <View className="flex-row gap-2 mb-4 overflow-x-auto">
          {[
            { key: "all", label: `All (${counts.total})` },
            { key: "owner", label: `Owners (${counts.owners})` },
            { key: "admin", label: `Admins (${counts.admins})` },
            { key: "member", label: `Members (${counts.members})` },
          ].map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setActiveFilter(tab.key as RoleFilter)}
                className={`py-1.5 px-3 rounded-full border ${
                  isSelected
                    ? "bg-brand-500 border-brand-500"
                    : "bg-ground-surface dark:bg-ground-card border-border-default"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? "text-white" : "text-text-secondary"
                  }`}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Member List */}
        {loading && rawMembers.length === 0 ? (
          <View className="items-center justify-center p-12 gap-3">
            <ActivityIndicator size="large" color="#10B981" />
            <Typography variant="caption" color="muted">
              Loading household members…
            </Typography>
          </View>
        ) : filteredMembers.length === 0 ? (
          <View className="items-center justify-center p-8 bg-ground-surface dark:bg-ground-card rounded-2xl border border-border-default gap-3">
            <View className="w-12 h-12 rounded-full bg-ground-subtle items-center justify-center">
              <Icon name="Users" size={24} color="#64748B" />
            </View>
            <Typography variant="body" className="font-bold text-center">
              No members found
            </Typography>
            <Typography variant="caption" color="muted" className="text-center">
              {activeFilter === "all"
                ? "There are no members in this household yet."
                : `No members with role "${activeFilter}" found.`}
            </Typography>
          </View>
        ) : (
          <View className="gap-3">
            {filteredMembers.map((member) => {
              const isOwner = member.role === "owner";
              const isAdmin = member.role === "admin";
              const isSelf = member.isCurrentUser;

              return (
                <Pressable
                  key={member.userId}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${member.displayName}, ${formatRole(member.role)}`}
                  onPress={() => setSelectedMember(member)}
                  className={`flex-row items-center p-4 bg-ground-surface dark:bg-ground-card rounded-2xl border border-border-default shadow-sm ${
                    isSelf ? "border-brand-500/40 bg-brand-50/20 dark:bg-brand-950/10" : ""
                  }`}
                >
                  {/* Member Avatar */}
                  <View className="mr-3 relative">
                    <Avatar
                      uri={member.avatarUrl}
                      initials={member.initials}
                      size="md"
                    />
                    {isOwner && (
                      <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 items-center justify-center border-2 border-ground-surface">
                        <Icon name="Crown" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  {/* Member Info */}
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center gap-1.5 flex-wrap">
                      <Typography variant="body" className="font-bold">
                        {member.displayName}
                      </Typography>
                      {isSelf && (
                        <View className="px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30">
                          <Text className="text-[10px] font-bold text-brand-500">
                            You
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-row items-center gap-2 mt-0.5">
                      {member.username ? (
                        <Typography variant="caption" color="muted">
                          @{member.username}
                        </Typography>
                      ) : member.email ? (
                        <Typography variant="caption" color="muted" numberOfLines={1}>
                          {member.email}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="muted">
                          {member.recentActivity}
                        </Typography>
                      )}
                    </View>
                  </View>

                  {/* Role Badge */}
                  <View className="flex-row items-center gap-2">
                    <View
                      className={`px-2.5 py-1 rounded-full border ${
                        isOwner
                          ? "bg-amber-50 dark:bg-amber-950/40 border-amber-400/50"
                          : isAdmin
                          ? "bg-sky-50 dark:bg-sky-950/40 border-sky-400/50"
                          : "bg-ground-subtle border-border-default"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          isOwner
                            ? "text-amber-700 dark:text-amber-300"
                            : isAdmin
                            ? "text-sky-700 dark:text-sky-300"
                            : "text-text-secondary"
                        }`}
                      >
                        {formatRole(member.role)}
                      </Text>
                    </View>

                    <Icon name="ChevronRight" size={16} color="#94A3B8" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Member Details Bottom Sheet Modal */}
      {selectedMember && (
        <MemberDetailSheet
          visible={Boolean(selectedMember)}
          member={selectedMember}
          currentUserRole={currentUserRole}
          onClose={() => setSelectedMember(null)}
          onUpdateRole={handleUpdateRole}
          onRemoveMember={handleRemoveMember}
          onLeaveHousehold={handleLeaveHousehold}
        />
      )}
    </SafeAreaView>
  );
}
