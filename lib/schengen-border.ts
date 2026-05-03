import { isInSchengen } from "@/lib/schengen";
import { isInBosniaAndHerzegovina } from "@/lib/bosnia";

const BORDER_MAX_ACCURACY_METERS = 250;
const BORDER_MIN_CONFIRM_POINTS = 3;
const BORDER_MIN_CONFIRM_MS = 10 * 60 * 1000;
const BORDER_MIN_DISTANCE_METERS = 2000;
const BORDER_EVENT_COOLDOWN_MS = 60 * 60 * 1000;

export type BorderCrossingType = "EXIT_BIH" | "ENTRY_BIH";

export type BorderZone = {
  id: string;
  name: string;
  centerLat: number;
  centerLon: number;
};

export type TransitionPosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recordedAt: Date;
};

type RegionState = "BIH" | "SCHENGEN_OUTSIDE_BIH" | "OTHER";

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRegionState(position: TransitionPosition): RegionState {
  const inBih = isInBosniaAndHerzegovina(position.latitude, position.longitude);
  if (inBih) return "BIH";

  const inSchengen = isInSchengen(position.latitude, position.longitude);
  if (inSchengen) return "SCHENGEN_OUTSIDE_BIH";

  return "OTHER";
}

export function detectBorderCrossings(
  positions: TransitionPosition[]
): Array<{
  type: BorderCrossingType;
  recordedAt: string;
  latitude: number;
  longitude: number;
  segmentStart: { latitude: number; longitude: number } | null;
  segmentEnd: { latitude: number; longitude: number } | null;
}> {
  const validPositions = positions.filter(
    (pos) => pos.accuracy === null || pos.accuracy <= BORDER_MAX_ACCURACY_METERS
  );

  if (validPositions.length === 0) return [];

  const borderCrossings: Array<{
    type: BorderCrossingType;
    recordedAt: string;
    latitude: number;
    longitude: number;
    segmentStart: { latitude: number; longitude: number } | null;
    segmentEnd: { latitude: number; longitude: number } | null;
  }> = [];
  let confirmedRegion: RegionState = getRegionState(validPositions[0]);
  let lastConfirmedPosition: TransitionPosition = validPositions[0];
  let candidateRegion: RegionState | null = null;
  let candidatePositions: TransitionPosition[] = [];
  let lastEventAt: number | null = null;

  const resetCandidate = () => {
    candidateRegion = null;
    candidatePositions = [];
  };

  for (const pos of validPositions.slice(1)) {
    const region = getRegionState(pos);

    if (region === confirmedRegion) {
      lastConfirmedPosition = pos;
      resetCandidate();
      continue;
    }

    const eligibleTransition =
      (confirmedRegion === "BIH" && region === "SCHENGEN_OUTSIDE_BIH") ||
      (confirmedRegion === "SCHENGEN_OUTSIDE_BIH" && region === "BIH");

    if (!eligibleTransition) {
      resetCandidate();
      continue;
    }

    if (candidateRegion !== region) {
      candidateRegion = region;
      candidatePositions = [pos];
      continue;
    }

    candidatePositions.push(pos);

    if (candidatePositions.length < BORDER_MIN_CONFIRM_POINTS) {
      continue;
    }

    const first = candidatePositions[0];
    const last = candidatePositions[candidatePositions.length - 1];
    const durationMs = last.recordedAt.getTime() - first.recordedAt.getTime();

    let traveledMeters = 0;
    for (let i = 1; i < candidatePositions.length; i++) {
      const prev = candidatePositions[i - 1];
      const current = candidatePositions[i];
      traveledMeters += distanceMeters(
        prev.latitude,
        prev.longitude,
        current.latitude,
        current.longitude
      );
    }

    if (durationMs < BORDER_MIN_CONFIRM_MS || traveledMeters < BORDER_MIN_DISTANCE_METERS) {
      continue;
    }

    const crossingTime = first.recordedAt.getTime();
    if (lastEventAt !== null && crossingTime - lastEventAt < BORDER_EVENT_COOLDOWN_MS) {
      confirmedRegion = region;
      lastConfirmedPosition = pos;
      lastEventAt = crossingTime;
      resetCandidate();
      continue;
    }

    const midpointLatitude = (lastConfirmedPosition.latitude + first.latitude) / 2;
    const midpointLongitude = (lastConfirmedPosition.longitude + first.longitude) / 2;
    const midpointTimestamp = new Date(
      (lastConfirmedPosition.recordedAt.getTime() + first.recordedAt.getTime()) / 2
    );

    borderCrossings.push({
      type: region === "SCHENGEN_OUTSIDE_BIH" ? "EXIT_BIH" : "ENTRY_BIH",
      recordedAt: midpointTimestamp.toISOString(),
      latitude: midpointLatitude,
      longitude: midpointLongitude,
      segmentStart: {
        latitude: lastConfirmedPosition.latitude,
        longitude: lastConfirmedPosition.longitude,
      },
      segmentEnd: {
        latitude: first.latitude,
        longitude: first.longitude,
      },
    });

    confirmedRegion = region;
    lastConfirmedPosition = pos;
    lastEventAt = crossingTime;
    resetCandidate();
  }

  return borderCrossings;
}

function projectMeters(
  latitude: number,
  longitude: number,
  refLatitude: number
): { x: number; y: number } {
  const latRad = (latitude * Math.PI) / 180;
  const lngRad = (longitude * Math.PI) / 180;
  const refLatRad = (refLatitude * Math.PI) / 180;
  const R = 6371000;

  return {
    x: R * lngRad * Math.cos(refLatRad),
    y: R * latRad,
  };
}

function distancePointToSegmentMeters(
  point: { latitude: number; longitude: number },
  segmentStart: { latitude: number; longitude: number },
  segmentEnd: { latitude: number; longitude: number }
): number {
  const refLatitude = (point.latitude + segmentStart.latitude + segmentEnd.latitude) / 3;
  const p = projectMeters(point.latitude, point.longitude, refLatitude);
  const a = projectMeters(segmentStart.latitude, segmentStart.longitude, refLatitude);
  const b = projectMeters(segmentEnd.latitude, segmentEnd.longitude, refLatitude);

  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abSquared = abx * abx + aby * aby;

  if (abSquared === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abSquared));
  const closestX = a.x + t * abx;
  const closestY = a.y + t * aby;

  return Math.hypot(p.x - closestX, p.y - closestY);
}

export function getNearestBorderCrossing(
  crossing: {
    latitude: number;
    longitude: number;
    segmentStart: { latitude: number; longitude: number } | null;
    segmentEnd: { latitude: number; longitude: number } | null;
  },
  zones: BorderZone[]
): { id: string; name: string; distanceMeters: number } | null {
  if (zones.length === 0) return null;

  let best: { id: string; name: string; distanceMeters: number } | null = null;

  for (const zone of zones) {
    const currentDistance =
      crossing.segmentStart && crossing.segmentEnd
        ? distancePointToSegmentMeters(
            { latitude: zone.centerLat, longitude: zone.centerLon },
            crossing.segmentStart,
            crossing.segmentEnd
          )
        : distanceMeters(crossing.latitude, crossing.longitude, zone.centerLat, zone.centerLon);

    if (!best || currentDistance < best.distanceMeters) {
      best = {
        id: zone.id,
        name: zone.name,
        distanceMeters: Math.round(currentDistance),
      };
    }
  }

  if (!best || best.distanceMeters > 25000) {
    return null;
  }

  return best;
}
