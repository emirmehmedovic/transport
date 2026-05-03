import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ClientLiveMapView } from "@/components/ClientLiveMapView";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  fetchClientLiveMap,
  fetchClientLoadDetail,
  fetchClientLoads,
  fetchClientNotifications,
  fetchClientProfile,
  markAllClientNotificationsRead,
  markClientNotificationRead,
} from "@/features/client/client-api";
import type {
  ClientLiveMapResponse,
  ClientLoadDetailResponse,
  ClientLoadsResponse,
  ClientNotificationsResponse,
  ClientProfileResponse,
} from "@/types/client";

type ClientSection = "overview" | "loads" | "live-map" | "notifications" | "profile";

type ClientHomeScreenProps = {
  lockedSection?: ClientSection;
  showSectionTabs?: boolean;
};

export function ClientHomeScreen({
  lockedSection,
  showSectionTabs = true,
}: ClientHomeScreenProps) {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const [section, setSection] = React.useState<ClientSection>("overview");
  const [loads, setLoads] = React.useState<ClientLoadsResponse | null>(null);
  const [profile, setProfile] = React.useState<ClientProfileResponse | null>(null);
  const [notifications, setNotifications] = React.useState<ClientNotificationsResponse | null>(null);
  const [liveMap, setLiveMap] = React.useState<ClientLiveMapResponse | null>(null);
  const [selectedLoadId, setSelectedLoadId] = React.useState<string | null>(null);
  const [selectedLoadDetail, setSelectedLoadDetail] =
    React.useState<ClientLoadDetailResponse | null>(null);
  const [loadDetailLoading, setLoadDetailLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const activeSection = lockedSection ?? section;

  React.useEffect(() => {
    let cancelled = false;

    async function loadClientData() {
      try {
        setLoading(true);
        setError(null);

        const [loadsData, profileData, notificationsData, liveMapData] = await Promise.all([
          fetchClientLoads(),
          fetchClientProfile(),
          fetchClientNotifications(),
          fetchClientLiveMap(),
        ]);

        if (!cancelled) {
          setLoads(loadsData);
          setProfile(profileData);
          setNotifications(notificationsData);
          setLiveMap(liveMapData);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Greška pri učitavanju client podataka.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadClientData();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSelectedLoadDetail() {
      if (!selectedLoadId) {
        setSelectedLoadDetail(null);
        return;
      }

      try {
        setLoadDetailLoading(true);
        const data = await fetchClientLoadDetail(selectedLoadId);
        if (!cancelled) {
          setSelectedLoadDetail(data);
        }
      } catch {
        if (!cancelled) {
          setSelectedLoadDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoadDetailLoading(false);
        }
      }
    }

    void loadSelectedLoadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedLoadId]);

  async function handleMarkNotificationRead(id: string) {
    try {
      await markClientNotificationRead(id);
      const fresh = await fetchClientNotifications();
      setNotifications(fresh);
    } catch (err: any) {
      setError(err?.message || "Greška pri označavanju notifikacije.");
    }
  }

  async function handleMarkAllNotificationsRead() {
    try {
      await markAllClientNotificationsRead();
      const fresh = await fetchClientNotifications();
      setNotifications(fresh);
    } catch (err: any) {
      setError(err?.message || "Greška pri označavanju svih notifikacija.");
    }
  }

  const sectionButton = (key: ClientSection, label: string) => (
    <Pressable
      key={key}
      onPress={() => setSection(key)}
      style={{
        minWidth: "48%",
        minHeight: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: section === key ? "#111827" : "#e5e7eb",
      }}
    >
      <Text
        style={{
          color: section === key ? "#ffffff" : "#111827",
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f7f7f5" }}>
      <View style={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>CLIENT</Text>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#111827" }}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={{ fontSize: 15, color: "#4b5563" }}>
            Mobile klijentski pregled koristi isti backend kao web portal.
          </Text>
        </View>

        {showSectionTabs ? (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {sectionButton("overview", "Pregled")}
            {sectionButton("loads", "Loadovi")}
            {sectionButton("live-map", "Mapa")}
            {sectionButton("notifications", "Notifikacije")}
            {sectionButton("profile", "Profil")}
          </View>
        ) : null}

        {loading ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 20,
              alignItems: "center",
            }}
          >
            <ActivityIndicator color="#111827" />
          </View>
        ) : error ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
              Greška
            </Text>
            <Text style={{ color: "#b91c1c" }}>{error}</Text>
          </View>
        ) : activeSection === "overview" ? (
          <>
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                Pregled
              </Text>
              <Text style={{ color: "#374151" }}>Ukupno loadova: {loads?.loads.length ?? 0}</Text>
              <Text style={{ color: "#374151" }}>
                Nepročitanih notifikacija: {notifications?.unreadCount ?? 0}
              </Text>
              <Text style={{ color: "#374151" }}>
                Aktivnih prikaza na mapi: {liveMap?.loads.length ?? 0}
              </Text>
            </View>
          </>
        ) : activeSection === "loads" ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              gap: 10,
            }}
          >
            {loads?.loads.length ? (
              loads.loads.map((load) => (
                <Pressable
                  key={load.id}
                  onPress={() =>
                    setSelectedLoadId((current) => (current === load.id ? null : load.id))
                  }
                  style={{
                    borderWidth: 1,
                    borderColor: selectedLoadId === load.id ? "#111827" : "#e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    gap: 4,
                    backgroundColor: selectedLoadId === load.id ? "#f3f4f6" : "#ffffff",
                  }}
                >
                  <Text style={{ color: "#111827", fontWeight: "600" }}>
                    {load.loadNumber} • {load.status}
                  </Text>
                  <Text style={{ color: "#374151" }}>{load.routeName || "Bez naziva rute"}</Text>
                  <Text style={{ color: "#4b5563" }}>
                    Pickup: {new Date(load.scheduledPickupDate).toLocaleDateString()}
                  </Text>
                  <Text style={{ color: "#4b5563" }}>
                    Delivery: {new Date(load.scheduledDeliveryDate).toLocaleDateString()}
                  </Text>
                  {load.driver ? (
                    <Text style={{ color: "#4b5563" }}>
                      Vozač: {load.driver.user.firstName} {load.driver.user.lastName}
                    </Text>
                  ) : null}
                  {load.truck ? (
                    <Text style={{ color: "#4b5563" }}>
                      Kamion: {load.truck.truckNumber} • {load.truck.make} {load.truck.model}
                    </Text>
                  ) : null}
                </Pressable>
              ))
            ) : (
              <Text style={{ color: "#6b7280" }}>Nema loadova za prikaz.</Text>
            )}

            {selectedLoadId ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#e5e7eb",
                  paddingTop: 12,
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
                  Detalji loada
                </Text>
                {loadDetailLoading ? (
                  <ActivityIndicator color="#111827" />
                ) : selectedLoadDetail?.load ? (
                  <>
                    <Text style={{ color: "#111827", fontWeight: "600" }}>
                      {selectedLoadDetail.load.loadNumber} • {selectedLoadDetail.load.status}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Pickup: {selectedLoadDetail.load.pickupAddress},{" "}
                      {selectedLoadDetail.load.pickupCity}, {selectedLoadDetail.load.pickupState}
                    </Text>
                    <Text style={{ color: "#374151" }}>
                      Delivery: {selectedLoadDetail.load.deliveryAddress},{" "}
                      {selectedLoadDetail.load.deliveryCity},{" "}
                      {selectedLoadDetail.load.deliveryState}
                    </Text>
                    <Text style={{ color: "#4b5563" }}>
                      Kontakt pickup: {selectedLoadDetail.load.pickupContactName} •{" "}
                      {selectedLoadDetail.load.pickupContactPhone}
                    </Text>
                    <Text style={{ color: "#4b5563" }}>
                      Kontakt delivery: {selectedLoadDetail.load.deliveryContactName} •{" "}
                      {selectedLoadDetail.load.deliveryContactPhone}
                    </Text>
                    {selectedLoadDetail.load.driver ? (
                      <Text style={{ color: "#4b5563" }}>
                        Vozač: {selectedLoadDetail.load.driver.user.firstName}{" "}
                        {selectedLoadDetail.load.driver.user.lastName}
                      </Text>
                    ) : null}
                    {selectedLoadDetail.load.truck ? (
                      <Text style={{ color: "#4b5563" }}>
                        Kamion: {selectedLoadDetail.load.truck.truckNumber} •{" "}
                        {selectedLoadDetail.load.truck.make}{" "}
                        {selectedLoadDetail.load.truck.model}
                      </Text>
                    ) : null}
                    {selectedLoadDetail.load.notes ? (
                      <Text style={{ color: "#4b5563" }}>
                        Napomena: {selectedLoadDetail.load.notes}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={{ color: "#6b7280" }}>Detalji loada nisu dostupni.</Text>
                )}
              </View>
            ) : null}
          </View>
        ) : activeSection === "live-map" ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
              Live mapa
            </Text>
            <ClientLiveMapView loads={liveMap?.loads || []} />
            {(liveMap?.loads || []).map((load) => (
              <View
                key={load.id}
                style={{
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  gap: 4,
                }}
              >
                <Text style={{ color: "#111827", fontWeight: "600" }}>
                  {load.loadNumber} • {load.status}
                </Text>
                <Text style={{ color: "#374151" }}>
                  {load.driver
                    ? `${load.driver.user.firstName} ${load.driver.user.lastName}`
                    : "Vozač nije dodijeljen"}
                </Text>
                {load.truck ? (
                  <Text style={{ color: "#4b5563" }}>
                    {load.truck.truckNumber} • {load.truck.make} {load.truck.model}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : activeSection === "notifications" ? (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
              Notifikacije
            </Text>
            <Pressable
              onPress={() => void handleMarkAllNotificationsRead()}
              style={{
                minHeight: 42,
                borderRadius: 10,
                backgroundColor: "#111827",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#ffffff", fontWeight: "600" }}>
                Označi sve kao pročitano
              </Text>
            </Pressable>
            {notifications?.notifications.length ? (
              notifications.notifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  onPress={() => void handleMarkNotificationRead(notification.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: notification.isRead ? "#e5e7eb" : "#111827",
                    borderRadius: 12,
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: "#111827", fontWeight: "600" }}>
                    {notification.title}
                  </Text>
                  <Text style={{ color: "#374151" }}>{notification.message}</Text>
                    <Text style={{ color: "#4b5563" }}>
                      Load: {notification.load.loadNumber} • {notification.load.status}
                    </Text>
                    {!notification.isRead ? (
                      <Text style={{ color: "#6b7280", fontSize: 12 }}>
                        Dodirni da označiš kao pročitano
                      </Text>
                    ) : null}
                </Pressable>
              ))
            ) : (
              <Text style={{ color: "#6b7280" }}>Nema notifikacija.</Text>
            )}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
              Profil klijenta
            </Text>
            <Text style={{ color: "#374151" }}>
              Kompanija: {profile?.profile?.companyName || "Nije uneseno"}
            </Text>
            <Text style={{ color: "#374151" }}>
              Adresa: {profile?.profile?.companyAddress || "Nije uneseno"}
            </Text>
            <Text style={{ color: "#374151" }}>
              Grad: {profile?.profile?.city || "Nije uneseno"}
            </Text>
            <Text style={{ color: "#374151" }}>
              Kontakt osoba: {profile?.profile?.contactPerson || "Nije uneseno"}
            </Text>
            <Text style={{ color: "#374151" }}>
              Kontakt telefon: {profile?.profile?.contactPhone || "Nije uneseno"}
            </Text>
            {profile?.profile?.notes ? (
              <Text style={{ color: "#4b5563" }}>Napomena: {profile.profile.notes}</Text>
            ) : null}
          </View>
        )}

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
    </ScrollView>
  );
}
