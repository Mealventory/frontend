import { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Typography, Badge, Avatar, Button, Icon } from "@/src/components/atoms";
import type { HouseholdRole } from "@/src/lib/householdApi";
import type { MemberProfile } from "@/src/lib/memberProfiles";
import { formatRole } from "@/src/lib/memberProfiles";

export interface MemberDetailSheetProps {
  visible: boolean;
  member: MemberProfile | null;
  currentUserRole?: HouseholdRole;
  onClose: () => void;
  onUpdateRole?: (member: MemberProfile, newRole: HouseholdRole) => Promise<void>;
  onRemoveMember?: (member: MemberProfile) => Promise<void>;
  onLeaveHousehold?: (member: MemberProfile) => Promise<void>;
}

const roleDescriptions: Record<HouseholdRole, string> = {
  owner: "Full administrative ownership. Can manage household settings, invite and remove members, and assign roles.",
  admin: "Household administrator. Can manage inventory, storage zones, recipes, and remove regular members.",
  member: "Kitchen collaborator. Can view, add, and consume pantry items and participate in meal planning.",
};

const roleColors: Record<HouseholdRole, { bg: string; border: string; text: string; ring: string }> = {
  owner: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-400/50 dark:border-amber-500/50",
    text: "text-amber-700 dark:text-amber-300",
    ring: "border-amber-400",
  },
  admin: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-400/50 dark:border-sky-500/50",
    text: "text-sky-700 dark:text-sky-300",
    ring: "border-sky-400",
  },
  member: {
    bg: "bg-ground-subtle dark:bg-ground-elevated",
    border: "border-border-default",
    text: "text-text-secondary",
    ring: "border-border-default",
  },
};

export function MemberDetailSheet({
  visible,
  member,
  currentUserRole = "member",
  onClose,
  onUpdateRole,
  onRemoveMember,
  onLeaveHousehold,
}: MemberDetailSheetProps) {
  const [selectedRole, setSelectedRole] = useState<HouseholdRole>(member?.role || "member");
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync selectedRole when member changes
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [member?.userId, member?.role]);

  if (!visible || !member) return null;

  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";
  const isSelf = member.isCurrentUser;
  const canManageRole = isOwner && !isSelf;
  const canRemove =
    (isOwner && !isSelf) || (isAdmin && member.role === "member" && !isSelf);

  const handleRoleChange = async () => {
    if (!onUpdateRole || selectedRole === member.role || actionBusy) return;
    setActionBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await onUpdateRole(member, selectedRole);
      setSuccessMessage(`Role updated to ${formatRole(selectedRole)}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update member role.");
    } finally {
      setActionBusy(false);
    }
  };

  const executeRemove = async () => {
    if (!onRemoveMember || actionBusy) return;
    setActionBusy(true);
    setErrorMessage(null);
    try {
      await onRemoveMember(member);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to remove member.");
      setActionBusy(false);
    }
  };

  const handleRemovePress = () => {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" && window.confirm
          ? window.confirm(`Are you sure you want to remove ${member.displayName} from this household?`)
          : true;
      if (confirmed) {
        void executeRemove();
      }
      return;
    }

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.displayName} from this household?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => void executeRemove() },
      ]
    );
  };

  const executeLeave = async () => {
    if (!onLeaveHousehold || actionBusy) return;
    setActionBusy(true);
    setErrorMessage(null);
    try {
      await onLeaveHousehold(member);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to leave household.");
      setActionBusy(false);
    }
  };

  const handleLeavePress = () => {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" && window.confirm
          ? window.confirm("Are you sure you want to leave this household?")
          : true;
      if (confirmed) {
        void executeLeave();
      }
      return;
    }

    Alert.alert(
      "Leave Household",
      "Are you sure you want to leave this household kitchen?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => void executeLeave() },
      ]
    );
  };

  const roleMeta = roleColors[member.role] || roleColors.member;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close member details backdrop"
          style={{ flex: 1 }}
          onPress={onClose}
        />
        <View className="bg-ground-surface dark:bg-ground-card rounded-t-[32px] p-6 max-w-lg w-full self-center border-t border-border-default shadow-2xl max-h-[90%]">
          {/* Top handle and close button */}
          <View className="flex-row items-center justify-between pb-3 mb-2 border-b border-border-subtle">
            <View className="w-10 h-1 bg-border-default rounded-full mx-auto self-center" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
              onPress={onClose}
              className="w-11 h-11 rounded-full bg-ground-subtle items-center justify-center absolute right-0"
            >
              <Icon name="X" size={18} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {/* Member Profile Hero */}
            <View className="items-center mt-2 mb-5">
              <View className={`p-1 rounded-3xl border-2 ${roleMeta.ring} mb-3`}>
                <Avatar
                  uri={member.avatarUrl}
                  initials={member.initials}
                  size="xl"
                />
              </View>

              <View className="flex-row items-center justify-center gap-2 mb-1 flex-wrap">
                <Typography variant="h2" className="text-center font-bold">
                  {member.displayName}
                </Typography>
                {member.isCurrentUser && (
                  <View className="px-2.5 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30">
                    <Text className="text-[11px] font-bold text-brand-500">
                      You
                    </Text>
                  </View>
                )}
              </View>

              {member.username && (
                <Typography variant="caption" color="muted" className="mb-0.5">
                  @{member.username}
                </Typography>
              )}

              {member.email && (
                <Typography variant="caption" color="secondary" className="mb-2">
                  {member.email}
                </Typography>
              )}

              {/* Role Badge with distinct styling */}
              <View
                className={`flex-row items-center px-3.5 py-1.5 rounded-full border ${roleMeta.bg} ${roleMeta.border} mt-1`}
              >
                <View className="mr-1.5">
                  {member.role === "owner" ? (
                    <Icon name="Crown" size={14} color="#D97706" />
                  ) : member.role === "admin" ? (
                    <Icon name="ShieldCheck" size={14} color="#0284C7" />
                  ) : (
                    <Icon name="User" size={14} color="#64748B" />
                  )}
                </View>
                <Text className={`text-[12px] font-bold uppercase tracking-wider ${roleMeta.text}`}>
                  {formatRole(member.role)}
                </Text>
              </View>
            </View>

            {/* Error or Success feedback */}
            {errorMessage && (
              <View
                accessibilityRole="alert"
                className="p-3.5 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30 mb-4 flex-row items-center gap-2"
              >
                <Icon name="AlertCircle" size={16} color="#DC2626" />
                <Typography variant="caption" className="text-urgency-critical flex-1">
                  {errorMessage}
                </Typography>
              </View>
            )}

            {successMessage && (
              <View
                accessibilityLiveRegion="polite"
                className="p-3.5 rounded-xl bg-urgency-fresh-bg border border-urgency-fresh/30 mb-4 flex-row items-center gap-2"
              >
                <Icon name="Check" size={16} color="#059669" />
                <Typography variant="caption" className="text-urgency-fresh flex-1">
                  {successMessage}
                </Typography>
              </View>
            )}

            {/* Profile Meta Cards */}
            <View className="p-4 bg-ground-subtle dark:bg-ground-elevated rounded-2xl border border-border-default mb-5 gap-3">
              <View className="flex-row items-start gap-3">
                <View className="w-8 h-8 rounded-lg bg-ground-surface dark:bg-ground-card border border-border-default items-center justify-center">
                  <Icon name="Info" size={16} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Typography variant="caption" className="font-bold mb-0.5">
                    Role Permissions
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {roleDescriptions[member.role]}
                  </Typography>
                </View>
              </View>

              <View className="h-px bg-border-subtle" />

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Icon name="Calendar" size={14} color="#64748B" />
                  <Typography variant="caption" color="secondary">
                    Join date
                  </Typography>
                </View>
                <Typography variant="caption" className="font-semibold">
                  {member.joinedAt}
                </Typography>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Icon name="Activity" size={14} color="#64748B" />
                  <Typography variant="caption" color="secondary">
                    Recent activity
                  </Typography>
                </View>
                <Typography variant="caption" className="font-semibold">
                  {member.recentActivity}
                </Typography>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <Icon name="Hash" size={14} color="#64748B" />
                  <Typography variant="caption" color="muted">
                    Member ID
                  </Typography>
                </View>
                <Typography variant="caption" color="muted" className="font-mono">
                  {member.userId.slice(0, 8)}…
                </Typography>
              </View>
            </View>

            {/* Owner Management Controls */}
            {canManageRole && (
              <View className="p-4 bg-ground-surface dark:bg-ground-card rounded-2xl border border-border-default mb-5 gap-3">
                <View className="flex-row items-center justify-between">
                  <Typography variant="body" className="font-bold">
                    Assign Role
                  </Typography>
                  <Badge label="Owner action" variant="brand" size="sm" />
                </View>
                <Typography variant="caption" color="muted">
                  Change this member’s permission level in the household.
                </Typography>

                <View className="flex-row gap-2 mt-1">
                  {(["member", "admin", "owner"] as HouseholdRole[]).map((r) => {
                    const isSelected = selectedRole === r;
                    return (
                      <Pressable
                        key={r}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => setSelectedRole(r)}
                        className={`flex-1 py-2.5 px-2 rounded-xl border items-center justify-center ${
                          isSelected
                            ? "bg-brand-500/15 border-brand-500"
                            : "bg-ground-subtle border-border-default"
                        }`}
                      >
                        <Text
                          className={`text-[12px] font-bold capitalize ${
                            isSelected ? "text-brand-500" : "text-text-secondary"
                          }`}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {selectedRole !== member.role && (
                  <Button
                    label={`Change Role to ${formatRole(selectedRole)}`}
                    variant="primary"
                    size="sm"
                    loading={actionBusy}
                    onPress={handleRoleChange}
                    className="mt-2"
                  />
                )}
              </View>
            )}

            {/* Remove / Leave Actions */}
            <View className="gap-3 mt-1">
              {canRemove && (
                <Button
                  label={`Remove from Household`}
                  variant="outline"
                  leadingIcon={<Icon name="UserMinus" size={16} color="#DC2626" />}
                  loading={actionBusy}
                  onPress={handleRemovePress}
                  className="border-red-300 dark:border-red-900/50"
                  labelClassName="text-urgency-critical"
                />
              )}

              {isSelf && (
                <Button
                  label="Leave Household"
                  variant="outline"
                  leadingIcon={<Icon name="LogOut" size={16} color="#DC2626" />}
                  loading={actionBusy}
                  onPress={handleLeavePress}
                  className="border-red-300 dark:border-red-900/50"
                  labelClassName="text-urgency-critical"
                />
              )}

              <Button
                label="Close"
                variant="secondary"
                size="md"
                onPress={onClose}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
