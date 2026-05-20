export type ReplayPositionLike = {
  latitude: number;
  longitude: number;
  recordedAt: string | Date;
};

export type ReplayPathSegmentPlan =
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

export const SNAP_MAX_GAP_MINUTES = 40;
export const SNAP_HARD_MAX_GAP_DISTANCE_KM = 45;
export const SNAP_BASE_GAP_DISTANCE_KM = 8;
export const SNAP_DISTANCE_PER_MINUTE_KM = 1.5;
export const SNAP_MAX_IMPLIED_SPEED_KMH = 125;
export const SNAP_MAX_WAYPOINTS_PER_REQUEST = 40;
export const SNAP_MAX_ANCHORS_PER_GROUP = 240;
export const SIMPLIFY_EPSILON_KM = 0.08;

export function buildReplayPathPlan(
  positions: ReplayPositionLike[]
): ReplayPathSegmentPlan[] {
  const plans: ReplayPathSegmentPlan[] = [];
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

export function calculateDistanceKm(
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

export function calculateGeometryDistanceKm(geometry: [number, number][]) {
  let total = 0;

  for (let i = 1; i < geometry.length; i++) {
    total += calculateDistanceKm(
      { latitude: geometry[i - 1][0], longitude: geometry[i - 1][1] },
      { latitude: geometry[i][0], longitude: geometry[i][1] }
    );
  }

  return total;
}

function shouldSnapAdjacentPoints(previous: ReplayPositionLike, current: ReplayPositionLike) {
  const gapMinutes =
    (new Date(current.recordedAt).getTime() - new Date(previous.recordedAt).getTime()) / 60000;

  if (gapMinutes <= 0 || gapMinutes > SNAP_MAX_GAP_MINUTES) {
    return false;
  }

  const distanceKm = calculateDistanceKm(previous, current);
  const dynamicDistanceLimitKm = Math.min(
    SNAP_HARD_MAX_GAP_DISTANCE_KM,
    Math.max(SNAP_BASE_GAP_DISTANCE_KM, gapMinutes * SNAP_DISTANCE_PER_MINUTE_KM)
  );

  if (distanceKm > dynamicDistanceLimitKm) {
    return false;
  }

  const impliedSpeedKmh = distanceKm / (gapMinutes / 60);
  return impliedSpeedKmh <= SNAP_MAX_IMPLIED_SPEED_KMH;
}

function buildSnappedPlansForGroup(
  positions: ReplayPositionLike[],
  startIndex: number,
  endIndex: number
): ReplayPathSegmentPlan[] {
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

function simplifyGroupIndices(
  positions: ReplayPositionLike[],
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
  positions: ReplayPositionLike[],
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

function perpendicularDistanceKm(
  point: ReplayPositionLike,
  lineStart: ReplayPositionLike,
  lineEnd: ReplayPositionLike
) {
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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
