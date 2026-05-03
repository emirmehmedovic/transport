import "react-native-gesture-handler";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useSessionBootstrap } from "@/features/auth/use-session-bootstrap";
import { usePushRegistration } from "@/features/push/use-push-registration";
import { useAuthStore } from "@/features/auth/auth-store";
import { RootRouter } from "@/navigation/RootRouter";

function AppContent() {
  const status = useAuthStore((state) => state.status);

  if (status === "loading" || status === "idle") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Ucitavanje sesije...</Text>
      </View>
    );
  }

  return <RootRouter />;
}

export default function App() {
  useSessionBootstrap();
  usePushRegistration();

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
