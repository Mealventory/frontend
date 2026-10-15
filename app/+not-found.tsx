import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon } from "@/src/components/atoms";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center px-6">
      <View className="w-16 h-16 rounded-2xl bg-urgency-critical-bg items-center justify-center mb-4">
        <Icon name="AlertTriangle" size={32} color="#F43F5E" />
      </View>
      <Typography variant="h2" className="mb-2 text-center">
        Screen Not Found
      </Typography>
      <Typography variant="body" color="muted" className="text-center mb-6">
        This route does not exist in the routing catalog.
      </Typography>
      <Button
        label="Go Home"
        variant="primary"
        onPress={() => router.replace("/" as any)}
      />
    </SafeAreaView>
  );
}
