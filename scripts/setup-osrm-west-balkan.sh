#!/usr/bin/env bash

set -euo pipefail

OSRM_ROOT="${OSRM_ROOT:-/opt/osrm}"
DATA_DIR="${OSRM_ROOT}/data"
BUILD_DIR="${OSRM_ROOT}/build"
IMAGE="${OSRM_IMAGE:-ghcr.io/project-osrm/osrm-backend}"
PROFILE="${OSRM_PROFILE:-/opt/car.lua}"
MERGED_NAME="${OSRM_MERGED_NAME:-west-balkan-core}"

mkdir -p "${DATA_DIR}" "${BUILD_DIR}"

if ! command -v osmium >/dev/null 2>&1; then
  echo "Missing dependency: osmium"
  echo "Install it first, for example on Ubuntu/Debian:"
  echo "  sudo apt-get update && sudo apt-get install -y osmium-tool"
  exit 1
fi

download_extract() {
  local url="$1"
  local output="$2"

  echo "Downloading ${output}..."
  wget -N -O "${DATA_DIR}/${output}" "${url}"
}

download_extract \
  "https://download.geofabrik.de/europe/bosnia-herzegovina-latest.osm.pbf" \
  "bosnia-herzegovina-latest.osm.pbf"
download_extract \
  "https://download.geofabrik.de/europe/croatia-latest.osm.pbf" \
  "croatia-latest.osm.pbf"
download_extract \
  "https://download.geofabrik.de/europe/serbia-latest.osm.pbf" \
  "serbia-latest.osm.pbf"
download_extract \
  "https://download.geofabrik.de/europe/slovenia-latest.osm.pbf" \
  "slovenia-latest.osm.pbf"

MERGED_PBF="${BUILD_DIR}/${MERGED_NAME}.osm.pbf"
MERGED_OSRM="${BUILD_DIR}/${MERGED_NAME}.osrm"

echo "Merging country extracts into ${MERGED_PBF}..."
osmium merge \
  "${DATA_DIR}/bosnia-herzegovina-latest.osm.pbf" \
  "${DATA_DIR}/croatia-latest.osm.pbf" \
  "${DATA_DIR}/serbia-latest.osm.pbf" \
  "${DATA_DIR}/slovenia-latest.osm.pbf" \
  -o "${MERGED_PBF}" \
  --overwrite

echo "Running osrm-extract..."
docker run --rm -t \
  -v "${BUILD_DIR}:/data" \
  "${IMAGE}" \
  osrm-extract -p "${PROFILE}" "/data/${MERGED_NAME}.osm.pbf"

echo "Running osrm-partition..."
docker run --rm -t \
  -v "${BUILD_DIR}:/data" \
  "${IMAGE}" \
  osrm-partition "/data/${MERGED_NAME}.osrm"

echo "Running osrm-customize..."
docker run --rm -t \
  -v "${BUILD_DIR}:/data" \
  "${IMAGE}" \
  osrm-customize "/data/${MERGED_NAME}.osrm"

echo
echo "OSRM preprocessing completed."
echo "Merged input: ${MERGED_PBF}"
echo "Routable dataset: ${MERGED_OSRM}"
echo
echo "Start OSRM server with:"
echo "docker run -d --name osrm --restart unless-stopped -p 5000:5000 -v ${BUILD_DIR}:/data ${IMAGE} osrm-routed --algorithm mld /data/${MERGED_NAME}.osrm"
