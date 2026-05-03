import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuthStore } from "@/features/auth/auth-store";

export function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const status = useAuthStore((state) => state.status);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = status === "loading";

  async function handleSubmit() {
    setError(null);

    if (!email.trim() || !password) {
      setError("Unesite email i lozinku.");
      return;
    }

    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Prijava nije uspjela.");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f5" }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          gap: 16,
        }}
      >
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827" }}>
            Transport Mobile
          </Text>
          <Text style={{ fontSize: 15, color: "#4b5563" }}>
            Interna Android aplikacija za vozače i klijente.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            style={{
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
              fontSize: 16,
              color: "#111827",
            }}
          />

          <TextInput
            secureTextEntry
            placeholder="Lozinka"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            style={{
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "#d1d5db",
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 14,
              fontSize: 16,
              color: "#111827",
            }}
          />
        </View>

        {error ? (
          <Text style={{ color: "#b91c1c", fontSize: 14 }}>{error}</Text>
        ) : null}

        <Pressable
          disabled={isSubmitting}
          onPress={() => void handleSubmit()}
          style={{
            minHeight: 52,
            borderRadius: 12,
            backgroundColor: isSubmitting ? "#9ca3af" : "#111827",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
              Prijava
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
