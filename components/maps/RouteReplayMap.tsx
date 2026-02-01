"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Play, Pause, RotateCcw, FastForward, Rewind } from "lucide-react";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
  driverName: string;
}

// Custom component to fit map to route bounds
function FitBounds({ positions }: { positions: Position[] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(
        positions.map((p) => [p.latitude, p.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
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

export default function RouteReplayMap({ positions, driverName }: RouteReplayMapProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset currentIndex when positions change
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
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
  const routeLine = visitedPositions.map((p) => [p.latitude, p.longitude] as [number, number]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };
  const handleSpeedChange = (speed: number) => setPlaybackSpeed(speed);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="h-[700px] rounded-xl overflow-hidden border border-dark-200">
        <MapContainer
          center={[currentPosition.latitude, currentPosition.longitude]}
          zoom={13}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Traveled route (polyline) */}
          {routeLine.length > 1 && (
            <Polyline positions={routeLine} color="#3b82f6" weight={4} opacity={0.7} />
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

          <FitBounds positions={positions} />
          <FollowPosition position={currentPosition} isPlaying={isPlaying} />
        </MapContainer>
      </div>

      {/* Playback Controls */}
      <div className="bg-white rounded-xl p-4 border border-dark-200">
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
        <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
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
