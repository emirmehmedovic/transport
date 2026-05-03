import React from "react";
import MapView, { Marker, UrlTile } from "react-native-maps";

type MapLoad = {
  id: string;
  loadNumber: string;
  status: string;
  driver?: {
    lastKnownLatitude: number | null;
    lastKnownLongitude: number | null;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
};

function getDefaultRegion(loads: MapLoad[]) {
  const points = loads
    .map((load) => load.driver ?? null)
    .filter(
      (driver): driver is NonNullable<MapLoad["driver"]> =>
        driver !== null &&
        driver !== undefined &&
        driver.lastKnownLatitude !== null &&
        driver.lastKnownLongitude !== null
    );

  if (points.length === 0) {
    return {
      latitude: 44.18,
      longitude: 17.66,
      latitudeDelta: 4,
      longitudeDelta: 4,
    };
  }

  const latitudes = points.map((point) => point.lastKnownLatitude as number);
  const longitudes = points.map((point) => point.lastKnownLongitude as number);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.2, (maxLat - minLat) * 1.8),
    longitudeDelta: Math.max(0.2, (maxLng - minLng) * 1.8),
  };
}

export function ClientLiveMapView({ loads }: { loads: MapLoad[] }) {
  return (
    <MapView style={{ width: "100%", height: 320, borderRadius: 16 }} initialRegion={getDefaultRegion(loads)}>
      <UrlTile
        urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
      />

      {loads.map((load) => {
        if (
          !load.driver ||
          load.driver.lastKnownLatitude === null ||
          load.driver.lastKnownLongitude === null
        ) {
          return null;
        }

        const driver = load.driver;
        const latitude = driver.lastKnownLatitude as number;
        const longitude = driver.lastKnownLongitude as number;

        return (
          <Marker
            key={load.id}
            coordinate={{
              latitude,
              longitude,
            }}
            title={`${load.loadNumber} • ${load.status}`}
            description={`${driver.user.firstName} ${driver.user.lastName}`}
          />
        );
      })}
    </MapView>
  );
}
