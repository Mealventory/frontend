import { Redirect, Stack } from "expo-router";
import { useAuth } from '@/src/context/AuthContext';

export default function ModalLayout() {
  const { ready, session, household, recovery } = useAuth();
  if (!ready) return null;
  if (recovery) return <Redirect href={'/reset-password' as any} />;
  if (!session || !household) return <Redirect href="/" />;
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
