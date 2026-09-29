import React from "react";
import { View } from "react-native";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { Typography, Badge, Avatar } from "@/src/components/atoms";

const members = [
  { id: "1", name: "Pablo Gomez (Admin)", role: "Owner", initials: "PG" },
  { id: "2", name: "Daniel Bajenov", role: "Member", initials: "DB" },
];

export default function HouseholdMembersScreen() {
  return (
    <RoutePlaceholder
      title="Household Members"
      category="Household"
      routePath="/(app)/household/members"
      description="Manage shared household collaborators and sync permissions."
      iconName="Users"
      showBackToHome={false}
    >
      <View className="gap-3">
        {members.map((member) => (
          <View
            key={member.id}
            className="flex-row items-center p-3.5 bg-ground-card rounded-2xl border border-border-default shadow-sm"
          >
            <Avatar initials={member.initials} size="md" className="mr-3" />
            <View className="flex-1">
              <Typography variant="body" className="font-bold">
                {member.name}
              </Typography>
              <Typography variant="caption" color="muted">
                {member.role}
              </Typography>
            </View>
            <Badge label={member.role} variant="brand" size="sm" />
          </View>
        ))}
      </View>
    </RoutePlaceholder>
  );
}
