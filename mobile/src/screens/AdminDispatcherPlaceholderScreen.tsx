import React from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { useAuthStore } from "@/features/auth/auth-store";

export function AdminDispatcherPlaceholderScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f5" }}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827" }}>
          {user?.role} mobile
        </Text>
        <Text style={{ fontSize: 15, color: "#4b5563" }}>
          Admin/dispečer mobilni moduli nisu dio prve MVP faze. Ovaj ekran je placeholder dok se ne otvori kasnija faza.
        </Text>
        <Pressable
          onPress={() => void signOut()}
          style={{
            minHeight: 48,
            borderRadius: 12,
            backgroundColor: "#111827",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
            Odjava
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
