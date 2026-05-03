import React from "react";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";

type ReplayPoint = {
  id: string;
  latitude: number;
  longitude: number;
  recordedAt: string;
};

type ReplayMapViewProps = {
  points: ReplayPoint[];
  focusPoint?: {
    latitude: number;
    longitude: number;
    label: string;
  } | null;
};

function getRegion(points: ReplayPoint[], focusPoint?: ReplayMapViewProps["focusPoint"]) {
  const allPoints = [
    ...points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
    })),
    ...(focusPoint ? [focusPoint] : []),
  ];

  if (allPoints.length === 0) {
    return {
      latitude: 44.18,
      longitude: 17.66,
      latitudeDelta: 3.5,
      longitudeDelta: 3.5,
    };
  }

  const latitudes = allPoints.map((point) => point.latitude);
  const longitudes = allPoints.map((point) => point.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.08, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.08, (maxLng - minLng) * 1.6),
  };
}

export function ReplayMapView({ points, focusPoint }: ReplayMapViewProps) {
  const routeCoordinates = points.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  const region = getRegion(points, focusPoint);
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <MapView
      style={{ width: "100%", height: 320, borderRadius: 16 }}
      initialRegion={region}
    >
      <UrlTile
        urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
        flipY={false}
      />

      {routeCoordinates.length > 1 ? (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#111827"
          strokeWidth={4}
        />
      ) : null}

      {startPoint ? (
        <Marker
          coordinate={{
            latitude: startPoint.latitude,
            longitude: startPoint.longitude,
          }}
          title="Start"
          description={new Date(startPoint.recordedAt).toLocaleString()}
          pinColor="green"
        />
      ) : null}

      {endPoint ? (
        <Marker
          coordinate={{
            latitude: endPoint.latitude,
            longitude: endPoint.longitude,
          }}
          title="Kraj"
          description={new Date(endPoint.recordedAt).toLocaleString()}
          pinColor="red"
        />
      ) : null}

      {focusPoint ? (
        <Marker
          coordinate={{
            latitude: focusPoint.latitude,
            longitude: focusPoint.longitude,
          }}
          title={focusPoint.label}
          pinColor="orange"
        />
      ) : null}
    </MapView>
  );
}
