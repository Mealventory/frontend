import { Stack } from "expo-router";

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: "modal",
      }}
    >
      <Stack.Screen name="scanner" />
      <Stack.Screen name="ai-review" />
      <Stack.Screen name="manual-add" />
    </Stack>
  );
}
