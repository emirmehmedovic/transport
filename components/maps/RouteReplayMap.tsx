"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Play, Pause, RotateCcw, FastForward, Rewind, MapPin } from "lucide-react";
import { formatDateTimeDMY } from "@/lib/date";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const stopIcon = L.divIcon({
  className: "stop-marker-icon",
  html: `
    <div style="
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      background: #f97316;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 2px;
        background: #ffffff;
      "></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

// Helper functions for landmarks
import { getLandmarkIcon, getLandmarkColor, getLandmarkLabel } from "@/lib/landmark-icons";

const createLandmarkIcon = (landmark: any) => {
  const iconColor = landmark.iconColor || getLandmarkColor(landmark.type);
  const svgIcon = getLandmarkIcon(landmark.type);

  return L.divIcon({
    html: `
      <div style="position: relative; text-align: center;">
        ${landmark.showLabel ? `
          <div style="
            position: absolute;
            bottom: 28px;
            left: 50%;
            transform: translateX(-50%);
            background: ${iconColor};
            color: white;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 9px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            border: 1.5px solid white;
          ">
            ${landmark.name}
          </div>
        ` : ''}
        <div style="
          width: 24px;
          height: 24px;
          background: ${iconColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          border: 2px solid white;
          color: white;
        ">
          ${svgIcon}
        </div>
      </div>
    `,
    className: 'landmark-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const SNAP_MAX_GAP_MINUTES = 15;
const SNAP_MAX_GAP_DISTANCE_KM = 3;
const SNAP_MAX_IMPLIED_SPEED_KMH = 130;
const SNAP_MAX_WAYPOINTS_PER_REQUEST = 40;
const SNAP_MAX_ANCHORS_PER_GROUP = 240;
const SIMPLIFY_EPSILON_KM = 0.08;

const snappedGeometryCache = new Map<string, [number, number][]>();

interface Position {
  id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  bearing: number | null;
  battery: number | null;
  recordedAt: string;
}

interface RouteReplayMapProps {
  positions: Position[];
  stops?: Array<{
    startAt: string;
    endAt: string;
    durationMinutes: number;
    latitude: number;
    longitude: number;
    positionCount: number;
    avgSpeed: number;
    radiusMeters: number;
  }>;
  driverName: string;
  fullScreen?: boolean;
  focusPoint?: {
    latitude: number;
    longitude: number;
    label?: string;
  } | null;
}

type ReplayPathSegment =
  | {
      kind: "snapped";
      fromIndex: number;
      toIndex: number;
      geometry: [number, number][];
    }
  | {
      kind: "gap";
      fromIndex: number;
      toIndex: number;
      geometry: [number, number][];
    };

type ReplayPathPlan =
  | {
      kind: "gap";
      fromIndex: number;
      toIndex: number;
      geometry: [number, number][];
    }
  | {
      kind: "snap";
      fromIndex: number;
      toIndex: number;
      anchorPoints: [number, number][];
      fallbackGeometry: [number, number][];
      cacheKey: string;
    };

// Custom component to focus on driver's position
function FocusOnDriver({
  positions,
}: {
  positions: Position[];
}) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      // Focus on the first position (driver's starting point) with zoom 13
      setTimeout(() => {
        map.setView(
          [positions[0].latitude, positions[0].longitude],
          13,
          { animate: true, duration: 0.5 }
        );
      }, 100);
    }
  }, [positions, map]);

  return null;
}

// Custom component to follow current position during replay
function FollowPosition({ position, isPlaying }: { position: Position; isPlaying: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (isPlaying) {
      map.panTo([position.latitude, position.longitude], { animate: true, duration: 0.5 });
    }
  }, [position, isPlaying, map]);

  return null;
}

function InvalidateSize({ trigger }: { trigger: number }) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => window.clearTimeout(id);
  }, [map, trigger]);

  return null;
}

function buildReplayPathPlan(positions: Position[]): ReplayPathPlan[] {
  const plans: ReplayPathPlan[] = [];
  let groupStart = 0;

  for (let i = 1; i < positions.length; i++) {
    if (!shouldSnapAdjacentPoints(positions[i - 1], positions[i])) {
      plans.push(...buildSnappedPlansForGroup(positions, groupStart, i - 1));
      plans.push({
        kind: "gap",
        fromIndex: i - 1,
        toIndex: i,
        geometry: [
          [positions[i - 1].latitude, positions[i - 1].longitude],
          [positions[i].latitude, positions[i].longitude],
        ],
      });
      groupStart = i;
    }
  }

  plans.push(...buildSnappedPlansForGroup(positions, groupStart, positions.length - 1));

  return plans;
}

function buildSnappedPlansForGroup(
  positions: Position[],
  startIndex: number,
  endIndex: number
): ReplayPathPlan[] {
  if (endIndex <= startIndex) {
    return [];
  }

  const simplifiedIndices = simplifyGroupIndices(positions, startIndex, endIndex);
  const limitedIndices = limitAnchorIndices(simplifiedIndices, SNAP_MAX_ANCHORS_PER_GROUP);
  const chunks = chunkAnchorIndices(limitedIndices, SNAP_MAX_WAYPOINTS_PER_REQUEST);

  return chunks
    .filter((chunk) => chunk.length >= 2)
    .map((chunk) => {
      const fromIndex = chunk[0];
      const toIndex = chunk[chunk.length - 1];
      const anchorPoints = chunk.map((index) => [
        positions[index].latitude,
        positions[index].longitude,
      ] as [number, number]);

      return {
        kind: "snap" as const,
        fromIndex,
        toIndex,
        anchorPoints,
        fallbackGeometry: positions
          .slice(fromIndex, toIndex + 1)
          .map((point) => [point.latitude, point.longitude] as [number, number]),
        cacheKey: anchorPoints
          .map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`)
          .join(";"),
      };
    });
}

function shouldSnapAdjacentPoints(previous: Position, current: Position) {
  const gapMinutes =
    (new Date(current.recordedAt).getTime() - new Date(previous.recordedAt).getTime()) / 60000;

  if (gapMinutes <= 0 || gapMinutes > SNAP_MAX_GAP_MINUTES) {
    return false;
  }

  const distanceKm = calculateDistanceKm(previous, current);
  if (distanceKm > SNAP_MAX_GAP_DISTANCE_KM) {
    return false;
  }
  const impliedSpeedKmh = distanceKm / (gapMinutes / 60);

  return impliedSpeedKmh <= SNAP_MAX_IMPLIED_SPEED_KMH;
}

function simplifyGroupIndices(
  positions: Position[],
  startIndex: number,
  endIndex: number
) {
  const relativeIndices = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, index) => startIndex + index
  );

  if (relativeIndices.length <= 2) {
    return relativeIndices;
  }

  const keep = new Set<number>();
  keep.add(relativeIndices[0]);
  keep.add(relativeIndices[relativeIndices.length - 1]);

  applyDouglasPeucker(positions, relativeIndices, 0, relativeIndices.length - 1, keep);

  return Array.from(keep).sort((a, b) => a - b);
}

function applyDouglasPeucker(
  positions: Position[],
  indices: number[],
  start: number,
  end: number,
  keep: Set<number>
) {
  if (end - start <= 1) {
    return;
  }

  const startPoint = positions[indices[start]];
  const endPoint = positions[indices[end]];
  let maxDistanceKm = 0;
  let splitIndex = -1;

  for (let i = start + 1; i < end; i++) {
    const point = positions[indices[i]];
    const distanceKm = perpendicularDistanceKm(point, startPoint, endPoint);

    if (distanceKm > maxDistanceKm) {
      maxDistanceKm = distanceKm;
      splitIndex = i;
    }
  }

  if (splitIndex !== -1 && maxDistanceKm > SIMPLIFY_EPSILON_KM) {
    keep.add(indices[splitIndex]);
    applyDouglasPeucker(positions, indices, start, splitIndex, keep);
    applyDouglasPeucker(positions, indices, splitIndex, end, keep);
  }
}

function limitAnchorIndices(indices: number[], maxAnchors: number) {
  if (indices.length <= maxAnchors) {
    return indices;
  }

  const limited = [indices[0]];
  const middleCount = maxAnchors - 2;

  for (let i = 1; i <= middleCount; i++) {
    const mappedIndex = Math.round((i * (indices.length - 2)) / (middleCount + 1));
    limited.push(indices[mappedIndex]);
  }

  limited.push(indices[indices.length - 1]);

  return Array.from(new Set(limited)).sort((a, b) => a - b);
}

function chunkAnchorIndices(indices: number[], chunkSize: number) {
  if (indices.length <= chunkSize) {
    return [indices];
  }

  const chunks: number[][] = [];
  let cursor = 0;

  while (cursor < indices.length - 1) {
    const chunk = indices.slice(cursor, cursor + chunkSize);
    if (chunk[chunk.length - 1] !== indices[indices.length - 1]) {
      cursor += chunkSize - 1;
    } else {
      cursor = indices.length;
    }
    chunks.push(chunk);
  }

  return chunks;
}

function perpendicularDistanceKm(point: Position, lineStart: Position, lineEnd: Position) {
  const ax = lineStart.longitude;
  const ay = lineStart.latitude;
  const bx = lineEnd.longitude;
  const by = lineEnd.latitude;
  const px = point.longitude;
  const py = point.latitude;
  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return calculateDistanceKm(point, lineStart);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const projected = {
    latitude: ay + t * dy,
    longitude: ax + t * dx,
  };

  return calculateDistanceKm(point, projected);
}

function calculateDistanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const R = 6371;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return R * c;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export default function RouteReplayMap({
  positions,
  stops = [],
  driverName,
  fullScreen = false,
  focusPoint = null,
}: RouteReplayMapProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [pathSegments, setPathSegments] = useState<ReplayPathSegment[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [showLandmarks, setShowLandmarks] = useState(true);

  // Reset currentIndex when positions change
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [positions]);

  // Fetch landmarks on mount
  useEffect(() => {
    const fetchLandmarks = async () => {
      try {
        const res = await fetch("/api/landmarks?activeOnly=true&pageSize=500");
        const data = await res.json();
        if (res.ok) {
          setLandmarks(data.landmarks || []);
        }
      } catch (error) {
        console.error("Error fetching landmarks:", error);
      }
    };
    fetchLandmarks();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function resolvePathSegments() {
      if (positions.length < 2) {
        setPathSegments([]);
        return;
      }

      const plan = buildReplayPathPlan(positions);
      const resolved = await Promise.all(
        plan.map(async (segment): Promise<ReplayPathSegment> => {
          if (segment.kind === "gap") {
            return segment;
          }

          const cached = snappedGeometryCache.get(segment.cacheKey);
          if (cached) {
            return {
              kind: "snapped",
              fromIndex: segment.fromIndex,
              toIndex: segment.toIndex,
              geometry: cached,
            };
          }

          try {
            const response = await fetch("/api/routing/osrm", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                coordinates: segment.anchorPoints.map(([lat, lng]) => ({ lat, lng })),
                alternatives: false,
              }),
            });

            if (!response.ok) {
              throw new Error(`OSRM HTTP ${response.status}`);
            }

            const data = await response.json();
            const geometry = Array.isArray(data?.routes) && data.routes[0]?.geometry
              ? data.routes[0].geometry
              : null;

            if (!geometry || geometry.length < 2) {
              throw new Error("OSRM geometry missing");
            }

            snappedGeometryCache.set(segment.cacheKey, geometry);

            return {
              kind: "snapped",
              fromIndex: segment.fromIndex,
              toIndex: segment.toIndex,
              geometry,
            };
          } catch {
            return {
              kind: "snapped",
              fromIndex: segment.fromIndex,
              toIndex: segment.toIndex,
              geometry: segment.fallbackGeometry,
            };
          }
        })
      );

      if (!isCancelled) {
        setPathSegments(resolved);
      }
    }

    void resolvePathSegments();

    return () => {
      isCancelled = true;
    };
  }, [positions]);

  // Playback effect
  useEffect(() => {
    if (isPlaying && currentIndex < positions.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= positions.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, positions.length, playbackSpeed]);

  if (positions.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-dark-50 rounded-xl">
        <p className="text-dark-400">Nema dostupnih podataka za prikaz</p>
      </div>
    );
  }

  const currentPosition = positions[currentIndex];
  const visitedPositions = positions.slice(0, currentIndex + 1);
  const fallbackVisitedLine = visitedPositions.map((p) => [p.latitude, p.longitude] as [number, number]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };
  const handleSpeedChange = (speed: number) => setPlaybackSpeed(speed);
  const [resizeTick, setResizeTick] = useState(0);

  useEffect(() => {
    setResizeTick((prev) => prev + 1);
  }, [fullScreen]);

  const formatDate = (dateStr: string) => formatDateTimeDMY(dateStr);
  const formatStopDuration = (durationMinutes: number) => {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} h ${minutes} min`;
    }
    if (hours > 0) {
      return `${hours} h`;
    }
    return `${minutes} min`;
  };

  const completedPathSegments =
    pathSegments.length > 0
      ? pathSegments.filter((segment) => segment.toIndex <= currentIndex)
      : [];
  const activePathSegments =
    pathSegments.length > 0
      ? pathSegments
          .filter(
            (segment) =>
              segment.kind === "snapped" &&
              segment.fromIndex < currentIndex &&
              segment.toIndex > currentIndex
          )
          .map((segment) => ({
            kind: "snapped" as const,
            geometry: positions
              .slice(segment.fromIndex, currentIndex + 1)
              .map((point) => [point.latitude, point.longitude] as [number, number]),
          }))
      : [];

  return (
    <div className={fullScreen ? "flex h-full flex-col" : "space-y-4"}>
      {/* Map */}
      <div
        className={
          fullScreen
            ? "flex-1 min-h-0 overflow-hidden border-b border-dark-200 relative"
            : "h-[700px] rounded-xl overflow-hidden border border-dark-200 relative"
        }
      >
        <MapContainer
          center={[currentPosition.latitude, currentPosition.longitude]}
          zoom={13}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Traveled route */}
          {pathSegments.length === 0 && fallbackVisitedLine.length > 1 && (
            <Polyline positions={fallbackVisitedLine} color="#3b82f6" weight={4} opacity={0.7} />
          )}

          {completedPathSegments.map((segment, index) => (
            <Polyline
              key={`completed-${segment.kind}-${segment.fromIndex}-${segment.toIndex}-${index}`}
              positions={segment.geometry}
              color={segment.kind === "gap" ? "#64748b" : "#3b82f6"}
              weight={segment.kind === "gap" ? 2 : 4}
              opacity={segment.kind === "gap" ? 0.9 : 0.75}
              dashArray={segment.kind === "gap" ? "6 8" : undefined}
            />
          ))}

          {activePathSegments.map((segment, index) =>
            segment.geometry.length > 1 ? (
              <Polyline
                key={`active-${index}`}
                positions={segment.geometry}
                color="#3b82f6"
                weight={4}
                opacity={0.75}
              />
            ) : null
          )}

          {/* Start marker */}
          <Marker position={[positions[0].latitude, positions[0].longitude]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">Start</p>
                <p className="text-xs text-dark-400">{formatDate(positions[0].recordedAt)}</p>
              </div>
            </Popup>
          </Marker>

          {/* Current position marker */}
          <Marker position={[currentPosition.latitude, currentPosition.longitude]}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{driverName}</p>
                <p className="text-xs">Vrijeme: {formatDate(currentPosition.recordedAt)}</p>
                {currentPosition.speed !== null && (
                  <p className="text-xs">Brzina: {Math.round(currentPosition.speed)} km/h</p>
                )}
                {currentPosition.battery !== null && (
                  <p className="text-xs">Baterija: {Math.round(currentPosition.battery)}%</p>
                )}
              </div>
            </Popup>
          </Marker>

          {/* End marker (if reached) */}
          {currentIndex === positions.length - 1 && (
            <Marker position={[positions[positions.length - 1].latitude, positions[positions.length - 1].longitude]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Kraj</p>
                  <p className="text-xs text-dark-400">
                    {formatDate(positions[positions.length - 1].recordedAt)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {focusPoint && (
            <Marker position={[focusPoint.latitude, focusPoint.longitude]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{focusPoint.label || "Tačka prelaza"}</p>
                  <p className="text-xs text-dark-400">
                    {focusPoint.latitude.toFixed(5)}, {focusPoint.longitude.toFixed(5)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {stops.map((stop, index) => (
            <Marker
              key={`${stop.startAt}-${stop.endAt}-${index}`}
              position={[stop.latitude, stop.longitude]}
              icon={stopIcon}
            >
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                Stop: {formatStopDuration(stop.durationMinutes)}
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">Detektovani stop</p>
                  <p className="text-xs">Trajanje: {formatStopDuration(stop.durationMinutes)}</p>
                  <p className="text-xs">Od: {formatDate(stop.startAt)}</p>
                  <p className="text-xs">Do: {formatDate(stop.endAt)}</p>
                  <p className="text-xs">
                    Lokacija: {stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs">
                    Tačke: {stop.positionCount}, radijus: {stop.radiusMeters} m
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render landmarks */}
          {showLandmarks && landmarks.map((landmark) => (
            <Marker
              key={`landmark-${landmark.id}`}
              position={[landmark.latitude, landmark.longitude]}
              icon={createLandmarkIcon(landmark)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: getLandmarkColor(landmark.type),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                      dangerouslySetInnerHTML={{ __html: getLandmarkIcon(landmark.type) }}
                    />
                    <h3 className="font-bold text-sm">{landmark.name}</h3>
                  </div>
                  <p className="text-xs text-dark-600 mb-2">
                    {getLandmarkLabel(landmark.type)}
                  </p>
                  {landmark.address && (
                    <p className="text-xs text-dark-500 mb-1">📍 {landmark.address}</p>
                  )}
                  {landmark.city && (
                    <p className="text-xs text-dark-500 mb-1">🏙️ {landmark.city}</p>
                  )}
                  {landmark.phone && (
                    <p className="text-xs text-dark-500 mb-1">📞 {landmark.phone}</p>
                  )}
                  {landmark.description && (
                    <p className="text-xs text-dark-400 mt-2 italic">{landmark.description}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          <FocusOnDriver positions={positions} />
          <FollowPosition position={currentPosition} isPlaying={isPlaying} />
          <InvalidateSize trigger={resizeTick} />
        </MapContainer>

        {/* Map Controls - Toggle Landmarks */}
        <div className="absolute top-4 right-4 z-[1000]">
          <button
            onClick={() => setShowLandmarks(!showLandmarks)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg ${
              showLandmarks
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-200'
            }`}
            title={showLandmarks ? 'Sakrij značajne tačke' : 'Prikaži značajne tačke'}
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {showLandmarks ? 'Sakrij tačke' : 'Prikaži tačke'}
            </span>
          </button>
        </div>
      </div>

      {/* Playback Controls */}
      <div
        className={
          fullScreen
            ? "bg-white p-4 border-t border-dark-200"
            : "bg-white rounded-xl p-4 border border-dark-200"
        }
      >
        {/* Timeline Slider */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={positions.length - 1}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-dark-400 mt-1">
            <span>{formatDate(positions[0].recordedAt)}</span>
            <span>
              {currentIndex + 1} / {positions.length}
            </span>
            <span>{formatDate(positions[positions.length - 1].recordedAt)}</span>
          </div>
          <div className="mt-2 text-center text-xs font-semibold text-dark-700">
            Trenutno: {formatDate(currentPosition.recordedAt)}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-dark-50 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 10))}
            className="p-2 rounded-lg hover:bg-dark-50 transition-colors"
            title="Rewind 10"
          >
            <Rewind className="w-5 h-5" />
          </button>

          {isPlaying ? (
            <button
              onClick={handlePause}
              className="p-3 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              title="Pause"
            >
              <Pause className="w-6 h-6" />
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="p-3 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
              title="Play"
              disabled={currentIndex >= positions.length - 1}
            >
              <Play className="w-6 h-6" />
            </button>
          )}

          <button
            onClick={() => setCurrentIndex(Math.min(positions.length - 1, currentIndex + 10))}
            className="p-2 rounded-lg hover:bg-dark-50 transition-colors"
            title="Forward 10"
          >
            <FastForward className="w-5 h-5" />
          </button>

          {/* Speed Control */}
          <div className="ml-4 flex items-center gap-2">
            <span className="text-sm text-dark-400">Brzina:</span>
            {[0.5, 1, 2, 5].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-50 hover:bg-dark-100'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        {/* Current Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          <div>
            <p className="text-dark-400">Vrijeme</p>
            <p className="font-semibold">{formatDate(currentPosition.recordedAt)}</p>
          </div>
          <div>
            <p className="text-dark-400">Brzina</p>
            <p className="font-semibold">
              {currentPosition.speed !== null ? `${Math.round(currentPosition.speed)} km/h` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-dark-400">Smjer</p>
            <p className="font-semibold">
              {currentPosition.bearing !== null ? `${Math.round(currentPosition.bearing)}°` : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-dark-400">Baterija</p>
            <p className="font-semibold">
              {currentPosition.battery !== null ? `${Math.round(currentPosition.battery)}%` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
