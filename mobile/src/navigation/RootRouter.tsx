import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text, View } from "react-native";
import { useAuthStore } from "@/features/auth/auth-store";
import { AdminDispatcherPlaceholderScreen } from "@/screens/AdminDispatcherPlaceholderScreen";
import { ClientHomeScreen } from "@/screens/ClientHomeScreen";
import { DriverHomeScreen } from "@/screens/DriverHomeScreen";
import { LoginScreen } from "@/screens/LoginScreen";

const DriverTab = createBottomTabNavigator();
const DriverStack = createNativeStackNavigator();
const ClientTab = createBottomTabNavigator();

function tabScreenOptions() {
  return {
    headerStyle: {
      backgroundColor: "#f7f7f5",
    },
    headerTitleStyle: {
      color: "#111827",
      fontWeight: "700" as const,
    },
    tabBarStyle: {
      height: 64,
      paddingBottom: 8,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: "600" as const,
    },
    tabBarActiveTintColor: "#111827",
    tabBarInactiveTintColor: "#6b7280",
  };
}

function DriverMoreScreen({
  navigation,
}: {
  navigation: {
    navigate: (screen: "DriverReplay" | "DriverInspections" | "DriverInbox") => void;
  };
}) {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f7f5", padding: 20, gap: 12 }}>
      {[
        { label: "Replay rute", screen: "DriverReplay" as const },
        { label: "Inspekcije", screen: "DriverInspections" as const },
        { label: "Inbox notifikacija", screen: "DriverInbox" as const },
      ].map((item) => (
        <Pressable
          key={item.screen}
          onPress={() => navigation.navigate(item.screen)}
          style={{
            minHeight: 52,
            borderRadius: 14,
            backgroundColor: "#ffffff",
            borderWidth: 1,
            borderColor: "#e5e7eb",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: "#111827", fontWeight: "700", fontSize: 16 }}>
            {item.label}
          </Text>
        </Pressable>
      ))}

      <Pressable
        onPress={() => void signOut()}
        style={{
          minHeight: 52,
          borderRadius: 14,
          backgroundColor: "#111827",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
          Odjava
        </Text>
      </Pressable>
    </View>
  );
}

function DriverTabs() {
  return (
    <DriverTab.Navigator screenOptions={tabScreenOptions}>
      <DriverTab.Screen name="Pregled">
        {() => <DriverHomeScreen lockedSection="overview" showSectionTabs={false} />}
      </DriverTab.Screen>
      <DriverTab.Screen name="Schengen">
        {() => <DriverHomeScreen lockedSection="schengen" showSectionTabs={false} />}
      </DriverTab.Screen>
      <DriverTab.Screen name="Loadovi">
        {() => <DriverHomeScreen lockedSection="loads" showSectionTabs={false} />}
      </DriverTab.Screen>
      <DriverTab.Screen name="Dokumenti">
        {() => <DriverHomeScreen lockedSection="documents" showSectionTabs={false} />}
      </DriverTab.Screen>
      <DriverTab.Screen name="Više" component={DriverMoreScreen} />
    </DriverTab.Navigator>
  );
}

function DriverNavigator() {
  return (
    <DriverStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#f7f7f5" },
        headerTitleStyle: { color: "#111827", fontWeight: "700" },
      }}
    >
      <DriverStack.Screen
        name="DriverTabs"
        component={DriverTabs}
        options={{ headerShown: false }}
      />
      <DriverStack.Screen name="DriverReplay" options={{ title: "Replay rute" }}>
        {() => <DriverHomeScreen lockedSection="replay" showSectionTabs={false} />}
      </DriverStack.Screen>
      <DriverStack.Screen name="DriverInspections" options={{ title: "Inspekcije" }}>
        {() => <DriverHomeScreen lockedSection="inspections" showSectionTabs={false} />}
      </DriverStack.Screen>
      <DriverStack.Screen name="DriverInbox" options={{ title: "Inbox notifikacija" }}>
        {() => <DriverHomeScreen lockedSection="inbox" showSectionTabs={false} />}
      </DriverStack.Screen>
    </DriverStack.Navigator>
  );
}

function ClientNavigator() {
  return (
    <ClientTab.Navigator screenOptions={tabScreenOptions}>
      <ClientTab.Screen name="Pregled">
        {() => <ClientHomeScreen lockedSection="overview" showSectionTabs={false} />}
      </ClientTab.Screen>
      <ClientTab.Screen name="Loadovi">
        {() => <ClientHomeScreen lockedSection="loads" showSectionTabs={false} />}
      </ClientTab.Screen>
      <ClientTab.Screen name="Mapa">
        {() => <ClientHomeScreen lockedSection="live-map" showSectionTabs={false} />}
      </ClientTab.Screen>
      <ClientTab.Screen name="Notifikacije">
        {() => <ClientHomeScreen lockedSection="notifications" showSectionTabs={false} />}
      </ClientTab.Screen>
      <ClientTab.Screen name="Profil">
        {() => <ClientHomeScreen lockedSection="profile" showSectionTabs={false} />}
      </ClientTab.Screen>
    </ClientTab.Navigator>
  );
}

export function RootRouter() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  return (
    <NavigationContainer>
      {status === "unauthenticated" || !user ? (
        <LoginScreen />
      ) : user.role === "DRIVER" ? (
        <DriverNavigator />
      ) : user.role === "CLIENT" ? (
        <ClientNavigator />
      ) : (
        <AdminDispatcherPlaceholderScreen />
      )}
    </NavigationContainer>
  );
}
