import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { fetchDriverRoutePlans } from "@/features/driver/route-plans-api";
import type {
  MobileRoutePlan,
  MobileRoutePlanLoad,
  MobileRoutePlanStop,
  MobileRoutePlansResponse,
} from "@/types/route-plan";

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Pon",
  TUESDAY: "Uto",
  WEDNESDAY: "Sri",
  THURSDAY: "Čet",
  FRIDAY: "Pet",
  SATURDAY: "Sub",
  SUNDAY: "Ned",
};

function formatDate(value?: string | null) {
  if (!value) return "Nije definisano";
  return new Date(value).toLocaleDateString();
}

function stopName(stop?: MobileRoutePlanStop) {
  if (!stop) return "Nije definisano";
  return stop.landmark?.name || stop.customCity || stop.customAddress || "Lokacija bez naziva";
}

function planEndpoints(plan: MobileRoutePlan) {
  return {
    pickup: stopName(plan.stops.find((stop) => stop.type === "PICKUP")),
    delivery: stopName(plan.stops.find((stop) => stop.type === "DELIVERY")),
  };
}

function PlanCard({ plan, title }: { plan: MobileRoutePlan; title?: string }) {
  const endpoints = planEndpoints(plan);

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        gap: 10,
      }}
    >
      {title ? (
        <Text style={{ color: "#2563eb", fontWeight: "800", fontSize: 12 }}>{title}</Text>
      ) : null}
      <View style={{ gap: 3 }}>
        <Text style={{ color: "#111827", fontSize: 18, fontWeight: "800" }}>
          {plan.planName}
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 13 }}>
          {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
        </Text>
      </View>

      <View style={{ backgroundColor: "#f3f4f6", borderRadius: 14, padding: 12, gap: 4 }}>
        <Text style={{ color: "#111827", fontWeight: "700" }}>
          {endpoints.pickup} → {endpoints.delivery}
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 12 }}>
          Dani: {plan.daysOfWeek.map((day) => DAY_LABELS[day] || day).join(", ")}
        </Text>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Text style={pillStyle}>{plan.status}</Text>
        <Text style={pillStyle}>{plan.distance} km</Text>
        {plan.truck?.truckNumber ? <Text style={pillStyle}>Kamion {plan.truck.truckNumber}</Text> : null}
      </View>

      {plan.specialInstructions ? (
        <View style={{ backgroundColor: "#fef3c7", borderRadius: 14, padding: 12 }}>
          <Text style={{ color: "#92400e", fontWeight: "700" }}>Instrukcije</Text>
          <Text style={{ color: "#92400e", marginTop: 4 }}>{plan.specialInstructions}</Text>
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={{ color: "#111827", fontWeight: "800" }}>Stopovi</Text>
        {plan.stops.map((stop) => (
          <View key={stop.id} style={{ borderLeftWidth: 3, borderLeftColor: "#111827", paddingLeft: 10 }}>
            <Text style={{ color: "#111827", fontWeight: "700" }}>
              #{stop.sequence + 1} {stop.type}
            </Text>
            <Text style={{ color: "#4b5563" }}>{stopName(stop)}</Text>
            {stop.scheduledTimeOffset !== null ? (
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                +{stop.scheduledTimeOffset} min od početka rute
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function LoadList({ title, loads }: { title: string; loads: MobileRoutePlanLoad[] }) {
  if (!loads.length) return null;

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: "#111827", fontSize: 18, fontWeight: "800" }}>{title}</Text>
      {loads.map((load) => (
        <View
          key={load.id}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: 14,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            gap: 4,
          }}
        >
          <Text style={{ color: "#111827", fontWeight: "800" }}>
            Load #{load.loadNumber}
          </Text>
          <Text style={{ color: "#4b5563" }}>
            {load.pickupCity || "-"} → {load.deliveryCity || "-"}
          </Text>
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            {load.status} • Pickup: {formatDate(load.scheduledPickupDate)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const pillStyle = {
  backgroundColor: "#f3f4f6",
  borderRadius: 999,
  color: "#374151",
  fontSize: 12,
  fontWeight: "700" as const,
  paddingHorizontal: 10,
  paddingVertical: 5,
};

export function RoutePlansScreen() {
  const [data, setData] = React.useState<MobileRoutePlansResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await fetchDriverRoutePlans();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška pri učitavanju planova");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f7f5" }}>
        <ActivityIndicator color="#111827" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f7f7f5" }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
    >
      <View style={{ padding: 20, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: "#6b7280", fontSize: 13, fontWeight: "700" }}>ROUTE PLANS</Text>
          <Text style={{ color: "#111827", fontSize: 28, fontWeight: "800" }}>
            Sedmični planovi
          </Text>
          <Text style={{ color: "#4b5563", fontSize: 15 }}>
            Pregled dodijeljenih ruta, stopova i instrukcija za vozača.
          </Text>
        </View>

        {error ? (
          <View style={{ backgroundColor: "#fee2e2", borderRadius: 16, padding: 14 }}>
            <Text style={{ color: "#991b1b", fontWeight: "700" }}>Greška</Text>
            <Text style={{ color: "#991b1b", marginTop: 4 }}>{error}</Text>
            <Pressable onPress={() => void load()} style={{ marginTop: 10 }}>
              <Text style={{ color: "#111827", fontWeight: "800" }}>Pokušaj ponovo</Text>
            </Pressable>
          </View>
        ) : null}

        {data?.currentWeekPlan ? (
          <PlanCard plan={data.currentWeekPlan} title="TEKUĆA SEDMICA" />
        ) : (
          <View style={{ backgroundColor: "#ffffff", borderRadius: 18, padding: 16 }}>
            <Text style={{ color: "#111827", fontWeight: "800" }}>Nema plana za ovu sedmicu</Text>
            <Text style={{ color: "#6b7280", marginTop: 4 }}>
              Kada dispatcher dodijeli sedmični plan, prikazat će se ovdje.
            </Text>
          </View>
        )}

        {data?.upcomingPlans?.length ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: "#111827", fontSize: 18, fontWeight: "800" }}>
              Naredni planovi
            </Text>
            {data.upcomingPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </View>
        ) : null}

        <LoadList title="Loadovi danas" loads={data?.todayLoads || []} />
        <LoadList title="Loadovi ove sedmice" loads={data?.thisWeekLoads || []} />
      </View>
    </ScrollView>
  );
}
