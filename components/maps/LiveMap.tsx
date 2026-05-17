"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, CircleMarker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, Package, Navigation, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import { getLoadStatusLabel as getMappedLoadStatusLabel } from "@/lib/ui-labels";

// Minimum zoom nivoi
const MIN_ZOOM_FOR_MARKERS = 9; // Za pickup/delivery/landmark tačke
const MIN_ZOOM_FOR_DRIVER_LABELS = 11; // Za imena vozača
const MIN_ZOOM_FOR_LANDMARK_LABELS = 13; // Za imena landmark tačaka

// Component to control map view
function MapController({ focusedDriverId, driverLocations }: { focusedDriverId: string | null, driverLocations: DriverLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (focusedDriverId) {
      const entity = driverLocations.find(d => d.id === focusedDriverId);
      if (entity) {
        map.setView([entity.latitude, entity.longitude], 12, {
          animate: true,
          duration: 1,
        });
      }
    }
  }, [focusedDriverId, driverLocations, map]);

  return null;
}

// Component to track zoom level and map clicks
function ZoomHandler({
  onZoomChange,
  onMapClick
}: {
  onZoomChange: (zoom: number) => void;
  onMapClick?: () => void;
}) {
  useMapEvents({
    zoomend: (e) => {
      onZoomChange(e.target.getZoom());
    },
    click: () => {
      if (onMapClick) {
        onMapClick();
      }
    },
  });
  return null;
}

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const stopIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const trailStartIcon = new L.DivIcon({
  html: `
    <div style="
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #10B981;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>
  `,
  className: "trail-start-icon",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const trailEndIcon = new L.DivIcon({
  html: `
    <div style="
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #EF4444;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>
  `,
  className: "trail-end-icon",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Helper function to check GPS status
function getGPSStatus(lastLocationUpdate: Date | null): 'active' | 'warning' | 'offline' {
  if (!lastLocationUpdate) return 'offline';

  const now = new Date().getTime();
  const lastUpdate = new Date(lastLocationUpdate).getTime();
  const minutesSinceUpdate = (now - lastUpdate) / 1000 / 60;

  if (minutesSinceUpdate < 18) return 'active';
  if (minutesSinceUpdate < 60) return 'warning'; // 18-60 minutes
  return 'offline'; // 60+ minutes
}

function getLocalDateParam() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Helper functions for landmarks
import { getLandmarkIcon, getLandmarkColor, getLandmarkLabel } from "@/lib/landmark-icons";

const createLandmarkIcon = (landmark: any, showLabel: boolean = false) => {
  const iconColor = landmark.iconColor || getLandmarkColor(landmark.type);
  const svgIcon = getLandmarkIcon(landmark.type);

  return L.divIcon({
    html: `
      <div style="position: relative; text-align: center;">
        ${showLabel ? `
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

// Custom truck icon for drivers using SVG
const createDriverIcon = (
  driverName: string,
  hasLoad: boolean,
  isSelected: boolean = false,
  lastLocationUpdate: Date | null = null,
  showLabel: boolean = true
) => {
  const iconColor = isSelected ? '#EF4444' : (hasLoad ? '#10B981' : '#3B82F6'); // Red if selected, Green if has load, blue if available

  // Get GPS status
  const gpsStatus = getGPSStatus(lastLocationUpdate);
  const gpsStatusColor = gpsStatus === 'active' ? '#10B981' : gpsStatus === 'warning' ? '#F59E0B' : '#EF4444';
  const gpsStatusPulse = gpsStatus === 'active' ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : '';

  return L.divIcon({
    html: `
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
      <div style="position: relative; text-align: center;">
        ${showLabel ? `
          <div style="
            position: absolute;
            bottom: 46px;
            left: 50%;
            transform: translateX(-50%);
            background: ${iconColor};
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            border: 2px solid white;
          ">
            ${driverName}
          </div>
        ` : ''}
        <!-- Modern pin with truck icon -->
        <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-${iconColor}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="grad-${iconColor}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${iconColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${iconColor};stop-opacity:0.85" />
            </linearGradient>
          </defs>
          <!-- Modern rounded pin shape -->
          <path d="M20 0 C11 0 4 7 4 16 C4 20 5 23 7 26 L20 46 L33 26 C35 23 36 20 36 16 C36 7 29 0 20 0 Z"
                fill="url(#grad-${iconColor})"
                stroke="white"
                stroke-width="2.5"
                filter="url(#shadow-${iconColor})"/>
          <!-- Inner circle for icon background -->
          <circle cx="20" cy="16" r="10" fill="white" opacity="0.2"/>
          <!-- Truck icon -->
          <g transform="translate(8, 6)">
            <path d="M1 8 L1 14 M15 8 L15 14" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <rect x="0" y="6" width="12" height="8" rx="1.5" fill="white" stroke="white" stroke-width="0.5"/>
            <path d="M12 8 L16 8 L18 11 L18 14 L16 14" fill="white" stroke="white" stroke-width="0.5"/>
            <circle cx="4" cy="15.5" r="1.8" fill="white" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
            <circle cx="14" cy="15.5" r="1.8" fill="white" stroke="rgba(0,0,0,0.3)" stroke-width="1"/>
            <line x1="2" y1="8" x2="10" y2="8" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
          </g>
        </svg>
        <!-- GPS Status Indicator -->
        <div style="
          position: absolute;
          top: -1px;
          right: 2px;
          width: 13px;
          height: 13px;
          background: ${gpsStatusColor};
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ${gpsStatusPulse}
        "></div>
      </div>
    `,
    className: 'custom-driver-icon',
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  });
};

// Custom briefcase icon for managers using SVG
const createManagerIcon = (
  managerName: string,
  isSelected: boolean = false,
  lastLocationUpdate: Date | null = null,
  showLabel: boolean = true
) => {
  const iconColor = isSelected ? '#EF4444' : '#F59E0B'; // Red if selected, orange otherwise

  // Get GPS status
  const gpsStatus = getGPSStatus(lastLocationUpdate);
  const gpsStatusColor = gpsStatus === 'active' ? '#10B981' : gpsStatus === 'warning' ? '#F59E0B' : '#EF4444';
  const gpsStatusPulse = gpsStatus === 'active' ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : '';

  return L.divIcon({
    html: `
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>
      <div style="position: relative; text-align: center;">
        ${showLabel ? `
          <div style="
            position: absolute;
            bottom: 46px;
            left: 50%;
            transform: translateX(-50%);
            background: ${iconColor};
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            border: 2px solid white;
          ">
            ${managerName}
          </div>
        ` : ''}
        <!-- Modern pin with briefcase icon -->
        <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-mgr-${iconColor}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="grad-mgr-${iconColor}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:${iconColor};stop-opacity:1" />
              <stop offset="100%" style="stop-color:${iconColor};stop-opacity:0.85" />
            </linearGradient>
          </defs>
          <!-- Modern rounded pin shape -->
          <path d="M20 0 C11 0 4 7 4 16 C4 20 5 23 7 26 L20 46 L33 26 C35 23 36 20 36 16 C36 7 29 0 20 0 Z"
                fill="url(#grad-mgr-${iconColor})"
                stroke="white"
                stroke-width="2.5"
                filter="url(#shadow-mgr-${iconColor})"/>
          <!-- Inner circle for icon background -->
          <circle cx="20" cy="16" r="10" fill="white" opacity="0.2"/>
          <!-- Briefcase icon -->
          <g transform="translate(10, 8)">
            <rect x="2" y="7" width="16" height="11" rx="1.5" fill="white" stroke="white" stroke-width="0.5"/>
            <path d="M6 7 L6 5 C6 4 7 3 8 3 L12 3 C13 3 14 4 14 5 L14 7" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
            <line x1="2" y1="12" x2="18" y2="12" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
          </g>
        </svg>
        <!-- GPS Status Indicator -->
        <div style="
          position: absolute;
          top: -1px;
          right: 2px;
          width: 13px;
          height: 13px;
          background: ${gpsStatusColor};
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ${gpsStatusPulse}
        "></div>
      </div>
    `,
    className: 'custom-manager-icon',
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  });
};

interface LoadData {
  id: string;
  loadNumber: string;
  status: string;
  pickupAddress: string;
  pickupCity: string;
  pickupState: string;
  pickupZip: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  pickupContactName: string;
  pickupContactPhone: string;
  scheduledPickupDate: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryZip: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryContactName: string;
  deliveryContactPhone: string;
  scheduledDeliveryDate: string;
  distance: number;
  loadRate: number;
  customRatePerMile: number | null;
  stops?: {
    id: string;
    sequence: number;
    type: string;
    address: string;
    city: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
  }[];
  driver: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  } | null;
  truck: {
    truckNumber: string;
  } | null;
}

interface LoadInfo {
  id: string;
  loadNumber: string;
  status: string;
  pickupCity: string;
  pickupState: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  deliveryCity: string;
  deliveryState: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  stops?: {
    id: string;
    sequence: number;
    type: string;
    address: string;
    city: string;
    state: string;
    latitude: number | null;
    longitude: number | null;
  }[];
}

type EntityType = 'DRIVER' | 'MANAGER';

interface DriverLocation {
  id: string;
  type: EntityType;
  driverId?: string;
  driverName: string;
  truckNumber: string | null;
  truckId: string | null;
  truckMake: string | null;
  truckModel: string | null;
  latitude: number;
  longitude: number;
  lastUpdate: string;
  loads: LoadInfo[];
  department?: string | null;
}

interface LiveMapProps {
  focusedDriverId?: string | null;
  hideAllDrivers?: boolean;
  hideRoutes?: boolean;
  hideLandmarks?: boolean;
  hideOtherDrivers?: boolean;
  hiddenDriverIds?: Set<string>;
  onDriverSelected?: (driverId: string) => void;
  onZoomStatusChange?: (status: { currentZoom: number; showMarkers: boolean; showDriverLabels: boolean; showLandmarkLabels: boolean }) => void;
}

interface DriverTrail {
  points: [number, number][];
  startAt: string | null;
  endAt: string | null;
}

export default function LiveMap({
  focusedDriverId,
  hideAllDrivers = false,
  hideRoutes = false,
  hideLandmarks = false,
  hideOtherDrivers = false,
  hiddenDriverIds = new Set(),
  onDriverSelected,
  onZoomStatusChange,
}: LiveMapProps = {}) {
  const router = useRouter();
  const [loads, setLoads] = useState<LoadData[]>([]);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [selectedLoadForPanel, setSelectedLoadForPanel] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(7);
  const [driverRoutes, setDriverRoutes] = useState<Record<string, {
    toPickup: [number, number][];
    toDelivery: [number, number][];
  }>>({});
  const [driverTrails, setDriverTrails] = useState<Record<string, DriverTrail>>({});
  const [selectedTrailDriverId, setSelectedTrailDriverId] = useState<string | null>(null);
  const [loadingTrailDriverId, setLoadingTrailDriverId] = useState<string | null>(null);
  const [loadRoutes, setLoadRoutes] = useState<Record<string, [number, number][]>>({});
  const [availableLoads, setAvailableLoads] = useState<LoadData[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [legendMinimized, setLegendMinimized] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const fetchInFlightRef = useRef(false);
  const [landmarks, setLandmarks] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchLandmarks();
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;

    try {
      setRefreshing(true);

      // Fetch active loads
      const activeOn = getLocalDateParam();
      const loadsRes = await fetch(
        `/api/loads?status=ASSIGNED,PICKED_UP,IN_TRANSIT&activeOn=${activeOn}`
      );
      const loadsData = await loadsRes.json();
      
      if (loadsRes.ok && loadsData.loads) {
        setLoads(loadsData.loads);
        // Calculate routes for all loads with GPS coordinates
        loadsData.loads.forEach((load: LoadData) => {
          if (load.pickupLatitude && load.pickupLongitude && 
              load.deliveryLatitude && load.deliveryLongitude) {
            calculateLoadRoute(load);
          }
        });
      }
      console.log("Total loads:", loadsData.loads?.length);
      
      if (loadsRes.ok) {
        // Filter loads that have GPS coordinates
        const loadsWithGPS = loadsData.loads.filter(
          (load: LoadData) => {
            const hasGPS = load.pickupLatitude &&
              load.pickupLongitude &&
              load.deliveryLatitude &&
              load.deliveryLongitude;
            
            if (!hasGPS) {
              console.log(`Load ${load.loadNumber} missing GPS:`, {
                pickup: { lat: load.pickupLatitude, lng: load.pickupLongitude },
                delivery: { lat: load.deliveryLatitude, lng: load.deliveryLongitude }
              });
            }
            
            return hasGPS;
          }
        );
        
        console.log("Loads with GPS:", loadsWithGPS.length);
        console.log("Loads data:", loadsWithGPS);
        setLoads(loadsWithGPS);
      }

      // Fetch driver locations and managers (with cache busting)
      const driversRes = await fetch(`/api/drivers/location?t=${Date.now()}`);
      const driversData = await driversRes.json();

      if (driversRes.ok && driversData.drivers) {
        // Map drivers
        const driverLocs = driversData.drivers.map((driver: any) => ({
          id: driver.id,
          type: 'DRIVER' as const,
          driverId: driver.id,
          driverName: `${driver.user.firstName} ${driver.user.lastName}`,
          truckNumber: driver.primaryTruck?.truckNumber || null,
          truckId: driver.primaryTruck?.id || null,
          truckMake: driver.primaryTruck?.make || null,
          truckModel: driver.primaryTruck?.model || null,
          latitude: driver.lastKnownLatitude,
          longitude: driver.lastKnownLongitude,
          lastUpdate: driver.lastLocationUpdate,
          loads: driver.loads || [],
        }));

        // Map managers (only for ADMIN)
        const managerLocs = (driversData.managers || []).map((manager: any) => ({
          id: manager.id,
          type: 'MANAGER' as const,
          driverName: `${manager.user.firstName} ${manager.user.lastName}`,
          truckNumber: null,
          truckId: null,
          truckMake: null,
          truckModel: null,
          latitude: manager.lastKnownLatitude,
          longitude: manager.lastKnownLongitude,
          lastUpdate: manager.lastLocationUpdate,
          loads: [],
          department: manager.department,
        }));

        // Combine drivers and managers
        const allEntities = [...driverLocs, ...managerLocs];

        console.log("Driver locations:", driverLocs.length);
        console.log("Manager locations:", managerLocs.length);
        setDriverLocations(allEntities);
      }

      // Fetch available loads (not assigned)
      const availableLoadsRes = await fetch("/api/loads?status=AVAILABLE");
      const availableLoadsData = await availableLoadsRes.json();
      
      if (availableLoadsRes.ok && availableLoadsData.loads) {
        setAvailableLoads(availableLoadsData.loads);
      }

      setLoading(false);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching map data:", error);
      setLoading(false);
    } finally {
      fetchInFlightRef.current = false;
      setRefreshing(false);
    }
  };

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

  // Calculate route using OSRM (for selected or first load with GPS coordinates)
  const calculateDriverRoute = async (driver: DriverLocation, loadId?: string) => {
    // Find specific load or first load with valid GPS coordinates
    let loadWithGPS: LoadInfo | undefined;
    
    if (loadId) {
      loadWithGPS = driver.loads.find(load => load.id === loadId);
    } else {
      loadWithGPS = driver.loads.find(load => 
        load.pickupLatitude &&
        load.pickupLongitude &&
        load.deliveryLatitude &&
        load.deliveryLongitude
      );
    }

    if (!loadWithGPS || !loadWithGPS.pickupLatitude || !loadWithGPS.pickupLongitude || 
        !loadWithGPS.deliveryLatitude || !loadWithGPS.deliveryLongitude) {
      return;
    }
    
    // Set selected load
    setSelectedLoadId(loadWithGPS.id);
    setSelectedTrailDriverId(null);

    try {
      // Route from driver to pickup
      const toPickupUrl = `https://router.project-osrm.org/route/v1/driving/${driver.longitude},${driver.latitude};${loadWithGPS.pickupLongitude},${loadWithGPS.pickupLatitude}?overview=full&geometries=geojson`;
      const toPickupRes = await fetch(toPickupUrl);
      const toPickupData = await toPickupRes.json();

      const stopPoints = (loadWithGPS.stops || [])
        .filter((stop) => typeof stop.latitude === "number" && typeof stop.longitude === "number")
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        .map((stop) => `${stop.longitude},${stop.latitude}`);

      // Route from pickup to delivery (via stops)
      const toDeliveryUrl = `https://router.project-osrm.org/route/v1/driving/${[
        `${loadWithGPS.pickupLongitude},${loadWithGPS.pickupLatitude}`,
        ...stopPoints,
        `${loadWithGPS.deliveryLongitude},${loadWithGPS.deliveryLatitude}`,
      ].join(";")}?overview=full&geometries=geojson`;
      const toDeliveryRes = await fetch(toDeliveryUrl);
      const toDeliveryData = await toDeliveryRes.json();

      if (toPickupData.routes && toPickupData.routes[0] && toDeliveryData.routes && toDeliveryData.routes[0]) {
        const toPickupCoords = toPickupData.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );
        const toDeliveryCoords = toDeliveryData.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        if (driver.driverId) {
          setDriverRoutes(prev => ({
            ...prev,
            [driver.driverId!]: {
              toPickup: toPickupCoords,
              toDelivery: toDeliveryCoords,
            }
          }));
        }
      }
    } catch (error) {
      console.error("Error calculating driver route:", error);
    }
  };

  // Assign load to driver
  const assignLoadToDriver = async (loadId: string, driverId: string, truckId: string | null) => {
    if (!truckId) {
      alert("Vozač nema dodijeljenog kamiona");
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch(`/api/loads/${loadId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          driverId,
          truckId,
        }),
      });

      if (res.ok) {
        // Refresh data
        await fetchData();
        alert("Load uspješno dodijeljen!");
      } else {
        const data = await res.json();
        alert(data.error || "Greška pri dodjeljivanju loada");
      }
    } catch (error) {
      console.error("Error assigning load:", error);
      alert("Greška pri dodjeljivanju loada");
    } finally {
      setAssigning(false);
    }
  };

  // Calculate load route using OSRM
  const calculateLoadRoute = async (load: LoadData) => {
    if (!load.pickupLatitude || !load.pickupLongitude || 
        !load.deliveryLatitude || !load.deliveryLongitude) {
      return;
    }

    // Check if route already calculated
    if (loadRoutes[load.id]) {
      return;
    }

    try {
      const stopPoints = (load.stops || [])
        .filter((stop) => typeof stop.latitude === "number" && typeof stop.longitude === "number")
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
        .map((stop) => `${stop.longitude},${stop.latitude}`);

      const waypoints = [
        `${load.pickupLongitude},${load.pickupLatitude}`,
        ...stopPoints,
        `${load.deliveryLongitude},${load.deliveryLatitude}`,
      ];

      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints.join(";")}?overview=full&geometries=geojson`;
      const res = await fetch(routeUrl);
      const data = await res.json();

      if (data.routes && data.routes[0]) {
        const coords = data.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        setLoadRoutes(prev => ({
          ...prev,
          [load.id]: coords,
        }));
      }
    } catch (error) {
      console.error("Error calculating load route:", error);
    }
  };

  const getStatusLabel = (status: string) => {
    return getMappedLoadStatusLabel(status);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ASSIGNED: "#3B82F6",
      PICKED_UP: "#F59E0B",
      IN_TRANSIT: "#8B5CF6",
      DELIVERED: "#10B981",
    };
    return colors[status] || "#6B7280";
  };

  const getTimeAgo = (date: string | Date) => {
    const now = new Date().getTime();
    const then = new Date(date).getTime();
    const diff = Math.floor((now - then) / 1000); // seconds

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Calculate center of all markers
  const calculateCenter = (): [number, number] => {
    if (loads.length === 0) return [44.8176, 17.3384]; // Bosnia center as default

    let totalLat = 0;
    let totalLng = 0;
    let count = 0;

    loads.forEach((load) => {
      if (load.pickupLatitude && load.pickupLongitude) {
        totalLat += load.pickupLatitude;
        totalLng += load.pickupLongitude;
        count++;
      }
      if (load.deliveryLatitude && load.deliveryLongitude) {
        totalLat += load.deliveryLatitude;
        totalLng += load.deliveryLongitude;
        count++;
      }
    });

    if (count === 0) return [44.8176, 17.3384];

    return [totalLat / count, totalLng / count];
  };

  const center = calculateCenter();

  const showMarkers = currentZoom >= MIN_ZOOM_FOR_MARKERS;
  const showDriverLabels = currentZoom >= MIN_ZOOM_FOR_DRIVER_LABELS;
  const showLandmarkLabels = currentZoom >= MIN_ZOOM_FOR_LANDMARK_LABELS;

  // Notify parent about zoom status changes
  useEffect(() => {
    if (onZoomStatusChange) {
      onZoomStatusChange({
        currentZoom,
        showMarkers,
        showDriverLabels,
        showLandmarkLabels,
      });
    }
  }, [currentZoom, showMarkers, showDriverLabels, showLandmarkLabels, onZoomStatusChange]);

  const handleMapClick = () => {
    if (selectedDriverId) {
      setSelectedDriverId(null);
      setSelectedLoadId(null);
      setSelectedTrailDriverId(null);
      if (onDriverSelected) {
        onDriverSelected("");
      }
    }
  };

  const openReplayWindow = (driverId: string, hours: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      limit: "2000",
    });
    router.push(`/drivers/${driverId}/replay?${params.toString()}`);
  };

  const fetchTodayTrail = async (driverId: string) => {
    setLoadingTrailDriverId(driverId);

    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: "5000",
      });

      const res = await fetch(`/api/drivers/${driverId}/positions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Greška pri učitavanju današnjeg kretanja");
        return;
      }

      const points: [number, number][] = (data.positions || [])
        .filter((position: any) => typeof position.latitude === "number" && typeof position.longitude === "number")
        .map((position: any) => [position.latitude, position.longitude] as [number, number]);

      setDriverTrails((prev) => ({
        ...prev,
        [driverId]: {
          points,
          startAt: data.positions?.[0]?.recordedAt || null,
          endAt: data.positions?.[data.positions.length - 1]?.recordedAt || null,
        },
      }));
      setSelectedTrailDriverId(driverId);
      setSelectedLoadId(null);
    } catch (error) {
      console.error("Error fetching today's trail:", error);
      alert("Greška pri učitavanju današnjeg kretanja");
    } finally {
      setLoadingTrailDriverId(null);
    }
  };

  const fetchManagerTrail = async (managerId: string) => {
    setLoadingTrailDriverId(managerId);

    try {
      // Full day (24 hours) for managers
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0); // Start of today

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        limit: "50000", // Full day with high limit
      });

      const res = await fetch(`/api/entities/${managerId}/positions?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Greška pri učitavanju kretanja managera");
        return;
      }

      const points: [number, number][] = (data.positions || [])
        .filter((position: any) => typeof position.latitude === "number" && typeof position.longitude === "number")
        .map((position: any) => [position.latitude, position.longitude] as [number, number]);

      setDriverTrails((prev) => ({
        ...prev,
        [managerId]: {
          points,
          startAt: data.positions?.[0]?.recordedAt || null,
          endAt: data.positions?.[data.positions.length - 1]?.recordedAt || null,
        },
      }));
      setSelectedTrailDriverId(managerId);
      setSelectedLoadId(null);
    } catch (error) {
      console.error("Error fetching manager trail:", error);
      alert("Greška pri učitavanju kretanja managera");
    } finally {
      setLoadingTrailDriverId(null);
    }
  };

  return (
    <div className="h-full w-full relative">
      {/* Map - Full Height */}
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
      >
          <MapController focusedDriverId={focusedDriverId || null} driverLocations={driverLocations} />
          <ZoomHandler onZoomChange={setCurrentZoom} onMapClick={handleMapClick} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render all loads */}
          {showMarkers && loads.map((load) => (
            <div key={load.id}>
              {/* Pickup Marker */}
              {load.pickupLatitude && load.pickupLongitude && (
                <CircleMarker
                  key={load.id}
                  center={[load.pickupLatitude, load.pickupLongitude]}
                  radius={6}
                  pathOptions={{
                    fillColor: "#22c55e",
                    fillOpacity: 0.8,
                    color: "#ffffff",
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: (e: any) => {
                      e.originalEvent?.stopPropagation();
                      setSelectedLoadForPanel(load.id);
                    },
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold text-green-700">📍 Pickup</p>
                      <p className="font-medium">{load.loadNumber}</p>
                      <p className="text-dark-600">{load.pickupCity}, {load.pickupState}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* Delivery Marker */}
              {load.deliveryLatitude && load.deliveryLongitude && (
                <CircleMarker
                  center={[load.deliveryLatitude, load.deliveryLongitude]}
                  radius={6}
                  pathOptions={{
                    fillColor: "#ef4444",
                    fillOpacity: 0.8,
                    color: "#ffffff",
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: (e: any) => {
                      e.originalEvent?.stopPropagation();
                      setSelectedLoadForPanel(load.id);
                    },
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold text-red-700">🎯 Delivery</p>
                      <p className="font-medium">{load.loadNumber}</p>
                      <p className="text-dark-600">{load.deliveryCity}, {load.deliveryState}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              )}

              {/* Stop Markers */}
              {(load.stops || [])
                .filter((stop) => typeof stop.latitude === "number" && typeof stop.longitude === "number")
                .map((stop) => (
                  <Marker
                    key={`${load.id}-stop-${stop.id}`}
                    position={[stop.latitude as number, stop.longitude as number]}
                    icon={stopIcon}
                    eventHandlers={{
                      click: (e: any) => {
                        e.originalEvent?.stopPropagation();
                        setSelectedLoadForPanel(load.id);
                      },
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold text-yellow-700">
                          Stop {stop.sequence}
                        </p>
                        <p className="text-dark-700">
                          {stop.address}, {stop.city} {stop.state}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {/* Route Line - Use calculated route if available, otherwise direct line */}
              {!hideRoutes &&
                load.pickupLatitude &&
                load.pickupLongitude &&
                load.deliveryLatitude &&
                load.deliveryLongitude && (
                  <Polyline
                    positions={
                      loadRoutes[load.id] ||
                      [
                        [load.pickupLatitude, load.pickupLongitude],
                        ...(load.stops || [])
                          .filter(
                            (stop) =>
                              typeof stop.latitude === "number" && typeof stop.longitude === "number"
                          )
                          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                          .map((stop) => [
                            stop.latitude as number,
                            stop.longitude as number,
                          ] as [number, number]),
                        [load.deliveryLatitude, load.deliveryLongitude],
                      ]
                    }
                    pathOptions={{
                      color: getStatusColor(load.status),
                      weight: 3,
                      opacity: 0.6,
                      dashArray: loadRoutes[load.id] ? undefined : "10, 10",
                    }}
                  />
                )}
            </div>
          ))}

          {/* Render driver routes (when selected) */}
          {!hideRoutes && driverLocations.map((driver) => {
            const isSelected = selectedDriverId === driver.driverId;
            // Find selected load or first load with GPS
            const loadWithGPS = selectedLoadId
              ? driver.loads.find(load => load.id === selectedLoadId)
              : driver.loads.find(load =>
                  load.pickupLatitude &&
                  load.pickupLongitude &&
                  load.deliveryLatitude &&
                  load.deliveryLongitude
                );
            const hasCalculatedRoute = driver.driverId ? driverRoutes[driver.driverId] : undefined;

            return (
              <div key={`route-${driver.id}`}>
                {/* Driver's route to pickup and then to delivery */}
                {isSelected && selectedLoadId && loadWithGPS && hasCalculatedRoute && (
                  <>
                    {/* Route from driver to pickup (calculated) */}
                    <Polyline
                      positions={hasCalculatedRoute.toPickup}
                      pathOptions={{
                        color: '#F59E0B',
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '10, 10',
                      }}
                    />
                    {/* Route from pickup to delivery (calculated) */}
                    <Polyline
                      positions={hasCalculatedRoute.toDelivery}
                      pathOptions={{
                        color: '#10B981',
                        weight: 4,
                        opacity: 0.8,
                      }}
                    />
                    {/* Pickup marker for selected driver's load */}
                    <Marker
                      position={[loadWithGPS.pickupLatitude!, loadWithGPS.pickupLongitude!]}
                      icon={pickupIcon}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold text-green-700">📍 Pickup</p>
                          <p className="font-medium">{loadWithGPS.loadNumber}</p>
                          <p className="text-dark-600">{loadWithGPS.pickupCity}, {loadWithGPS.pickupState}</p>
                        </div>
                      </Popup>
                    </Marker>
                    {/* Delivery marker for selected driver's load */}
                    <Marker
                      position={[loadWithGPS.deliveryLatitude!, loadWithGPS.deliveryLongitude!]}
                      icon={deliveryIcon}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold text-red-700">🎯 Delivery</p>
                          <p className="font-medium">{loadWithGPS.loadNumber}</p>
                          <p className="text-dark-600">{loadWithGPS.deliveryCity}, {loadWithGPS.deliveryState}</p>
                        </div>
                      </Popup>
                    </Marker>
                    {(loadWithGPS.stops || [])
                      .filter((stop) => typeof stop.latitude === "number" && typeof stop.longitude === "number")
                      .map((stop) => (
                        <Marker
                          key={`selected-stop-${stop.id}`}
                          position={[stop.latitude as number, stop.longitude as number]}
                          icon={stopIcon}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold text-yellow-700">
                                Stop {stop.sequence}
                              </p>
                              <p className="text-dark-700">
                                {stop.address}, {stop.city} {stop.state}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </>
                )}

                {isSelected &&
                  selectedTrailDriverId === driver.driverId &&
                  driverTrails[driver.driverId] &&
                  driverTrails[driver.driverId].points.length > 0 && (
                    <>
                      <Polyline
                        positions={driverTrails[driver.driverId].points}
                        pathOptions={{
                          color: "#06B6D4",
                          weight: 4,
                          opacity: 0.85,
                        }}
                      />
                      <Marker
                        position={driverTrails[driver.driverId].points[0]}
                        icon={trailStartIcon}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold text-green-700">Start dana</p>
                            {driverTrails[driver.driverId].startAt && (
                              <p className="text-dark-600">
                                {new Date(driverTrails[driver.driverId].startAt as string).toLocaleString("bs-BA")}
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                      <Marker
                        position={driverTrails[driver.driverId].points[driverTrails[driver.driverId].points.length - 1]}
                        icon={trailEndIcon}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold text-red-700">Zadnja tačka danas</p>
                            {driverTrails[driver.driverId].endAt && (
                              <p className="text-dark-600">
                                {new Date(driverTrails[driver.driverId].endAt as string).toLocaleString("bs-BA")}
                              </p>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    </>
                  )}
              </div>
            );
          })}

          {/* Render driver and manager locations */}
          {!hideAllDrivers && driverLocations.map((entity) => {
            const isSelected = selectedDriverId === entity.id || focusedDriverId === entity.id;
            const lastLocationUpdate = entity.lastUpdate ? new Date(entity.lastUpdate) : null;

            // Hide if this driver is in the hiddenDriverIds set
            if (hiddenDriverIds.has(entity.id)) {
              return null;
            }

            // Hide other drivers if hideOtherDrivers is true and this one is not selected
            if (hideOtherDrivers && selectedDriverId && entity.id !== selectedDriverId) {
              return null;
            }

            const icon = entity.type === 'MANAGER'
              ? createManagerIcon(entity.driverName, isSelected, lastLocationUpdate, showDriverLabels)
              : createDriverIcon(entity.driverName, entity.loads.length > 0, isSelected, lastLocationUpdate, showDriverLabels);

            return (
              <Marker
                key={entity.id}
                position={[entity.latitude, entity.longitude]}
                icon={icon}
                eventHandlers={{
                  click: async (e: any) => {
                    // Prevent map click event from firing
                    e.originalEvent?.stopPropagation();

                    if (entity.id === selectedDriverId) {
                      // Deselect
                      setSelectedDriverId(null);
                      setSelectedLoadId(null);
                      setSelectedTrailDriverId(null);
                      // Notify parent to show all drivers again
                      if (onDriverSelected) {
                        onDriverSelected("");
                      }
                    } else {
                      // Select entity and show current location/panel only.
                      setSelectedDriverId(entity.id);
                      setSelectedLoadId(null);
                      // Call onDriverSelected callback if provided
                      if (onDriverSelected) {
                        onDriverSelected(entity.id);
                      }
                    }
                  },
                }}
              />
            );
          })}

          {/* Render landmarks */}
          {!hideLandmarks && showMarkers && landmarks.map((landmark) => (
            <Marker
              key={`landmark-${landmark.id}`}
              position={[landmark.latitude, landmark.longitude]}
              icon={createLandmarkIcon(landmark, showLandmarkLabels)}
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
      </MapContainer>

      {/* Floating Driver/Manager Info Panel - Bottom Left */}
      {selectedDriverId && driverLocations.find(d => d.id === selectedDriverId) && (
        <div className="absolute top-4 bottom-4 left-4 z-[1000] w-[420px]">
          {(() => {
            const entity = driverLocations.find(d => d.id === selectedDriverId)!;
            const isDriver = entity.type === 'DRIVER';
            const entityActive = isDriver && entity.loads.length > 0;

            return (
              <div className="relative h-full rounded-3xl bg-dark-900/95 text-white border border-white/10 shadow-soft-xl backdrop-blur p-4 overflow-y-auto">
                <button
                  onClick={() => setSelectedDriverId(null)}
                  className="absolute top-3 right-3 text-dark-300 hover:text-white transition-colors"
                >
                  ✕
                </button>

                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/10">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft ${
                    entity.type === 'MANAGER'
                      ? 'bg-orange-500/20 text-orange-200'
                      : entityActive
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-electric-500/20 text-electric-100'
                  }`}>
                    {entity.type === 'MANAGER' ? <Package className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold">{entity.driverName}</p>
                    <p className="text-xs text-dark-200">
                      {entity.type === 'MANAGER'
                        ? `Manager${entity.department ? ` • ${entity.department}` : ''}`
                        : entity.truckNumber
                          ? `Kamion ${entity.truckNumber}${entity.truckMake ? ` • ${entity.truckMake} ${entity.truckModel || ""}` : ""}`
                          : "Bez dodijeljenog kamiona"}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                    entity.type === 'MANAGER'
                      ? 'bg-orange-500/15 text-orange-200 border border-orange-500/40'
                      : entityActive
                        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40'
                        : 'bg-electric-500/15 text-electric-100 border border-electric-500/40'
                  }`}>
                    {entity.type === 'MANAGER' ? 'Manager' : entityActive ? 'Aktivan' : 'Dostupan'}
                  </span>
                </div>

                {isDriver && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3 mb-3 border-b border-white/10">
                      <button
                        type="button"
                        onClick={() => router.push(`/drivers/${entity.driverId}`)}
                        className="px-3 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
                      >
                        Detalji vozača
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (entity.truckId) {
                            router.push(`/trucks/${entity.truckId}`);
                          }
                        }}
                        disabled={!entity.truckId}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                      >
                        Detalji kamiona
                      </button>
                    </div>

                    <div className="pb-3 mb-3 border-b border-white/10">
                      <p className="text-[11px] font-semibold text-dark-200 uppercase tracking-wide mb-2">
                        Brzi replay
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 3, 6].map((hours) => (
                          <button
                            key={hours}
                            type="button"
                            onClick={() => openReplayWindow(entity.driverId!, hours)}
                            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                          >
                        {hours}h
                      </button>
                    ))}
                  </div>
                </div>

                    <div className="pb-3 mb-3 border-b border-white/10">
                      <p className="text-[11px] font-semibold text-dark-200 uppercase tracking-wide mb-2">
                        Današnje kretanje
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => entity.type === 'MANAGER' ? fetchManagerTrail(entity.id) : fetchTodayTrail(entity.driverId!)}
                          disabled={loadingTrailDriverId === entity.id}
                          className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                        >
                          {loadingTrailDriverId === entity.id ? "Učitavanje..." : "Prikaži trasu"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTrailDriverId(null)}
                          disabled={selectedTrailDriverId !== entity.id}
                          className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                        >
                          Sakrij trasu
                        </button>
                      </div>
                      {selectedTrailDriverId === entity.id && driverTrails[entity.id] && (
                        <p className="text-[11px] text-cyan-200 mt-2">
                          Prikazano tačaka: {driverTrails[entity.id].points.length}
                        </p>
                      )}
                    </div>

                    {/* Current Loads */}
                    {entity.loads.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <p className="text-[11px] font-semibold text-dark-200 uppercase tracking-wide">
                          Aktivni loadovi ({entity.loads.length})
                        </p>
                        {entity.loads.map((load, index) => {
                          const isSelectedLoad = selectedLoadId === load.id;
                          const hasGPS = load.pickupLatitude && load.pickupLongitude &&
                                        load.deliveryLatitude && load.deliveryLongitude;

                          return (
                            <div
                              key={load.id}
                              className={`rounded-2xl p-3 cursor-pointer transition-all border ${isSelectedLoad ? 'bg-primary-500/10 border-primary-500/60' : 'bg-white/5 border-white/10 hover:border-primary-400/60'}`}
                              onClick={() => {
                                if (hasGPS) {
                                  calculateDriverRoute(entity, load.id);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-dark-200 uppercase tracking-wide">Load #{index + 1}</span>
                                  {!hasGPS && (
                                    <span className="text-[10px] text-orange-200 bg-orange-500/20 border border-orange-400/40 px-2 py-0.5 rounded-full">Nema GPS</span>
                                  )}
                                </div>
                                <a
                                  href={`/loads/${load.id}`}
                                  className="text-[11px] text-primary-200 hover:text-primary-50 font-semibold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Detalji →
                                </a>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-primary-200">
                                  <Package className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{load.loadNumber}</p>
                                  <p className="text-xs text-dark-200">{load.pickupCity} → {load.deliveryCity}</p>
                                  <p className="text-[11px] text-dark-300 mt-0.5">Status: {getStatusLabel(load.status)}</p>
                                  {hasGPS && !isSelectedLoad && (
                                    <p className="text-[11px] text-primary-200 mt-1 font-semibold">Klikni za prikaz rute</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {/* Assign Load (only for drivers) */}
                {isDriver && (
                  <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-dark-200 uppercase tracking-wide">
                        {entity.loads.length === 0 ? "Dodijeli load" : "Dodaj dodatni load"}
                      </p>
                      <span
                        className="text-[10px] text-dark-300 flex items-center gap-1"
                        title={new Date(entity.lastUpdate).toLocaleString("bs-BA")}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        {getTimeAgo(entity.lastUpdate)}
                      </span>
                    </div>

                    {availableLoads.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value && entity.truckId && entity.driverId) {
                              const selectedLoad = availableLoads.find(l => l.id === e.target.value);
                              if (selectedLoad) {
                                if (entity.loads.length > 0) {
                                  const loadsList = entity.loads.map(l => l.loadNumber).join(', ');
                                  const confirmed = window.confirm(`Dodijeli ${selectedLoad.loadNumber} vozaču ${entity.driverName}?\n\nVozač već ima ${entity.loads.length} aktivnih loada: ${loadsList}`);
                                  if (!confirmed) {
                                    e.target.value = "";
                                    return;
                                  }
                                }
                                assignLoadToDriver(e.target.value, entity.driverId, entity.truckId);
                              }
                              e.target.value = "";
                            }
                          }}
                          disabled={assigning}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-dark-900 border border-white/15 text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">{entity.loads.length === 0 ? "Odaberi load..." : "Odaberi dodatni load..."}</option>
                          {availableLoads.map((load) => (
                            <option key={load.id} value={load.id}>
                              {load.loadNumber} - {load.pickupCity} → {load.deliveryCity}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-dark-300 italic">Nema dostupnih loadova</p>
                    )}

                    <a
                      href="/loads/new"
                      className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold py-2 px-3 rounded-xl transition-colors shadow-primary"
                    >
                      + Kreiraj novi load
                    </a>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Loading/Refresh Indicator */}
      {(loading || refreshing) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[1000]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-dark-700">
            {loading ? 'Učitavanje podataka...' : 'Osvježavanje...'}
          </span>
        </div>
      )}

      {/* Last Refresh Indicator */}
      {!loading && lastRefresh && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-dark-900/90 text-white px-3 py-1 rounded-full text-xs z-[1000] flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
          <span>Ažurirano: {getTimeAgo(lastRefresh)}</span>
        </div>
      )}

      {/* Legend - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-[1000] max-w-xs">
        <div className="rounded-3xl bg-dark-900/95 text-white border border-white/10 shadow-soft-xl backdrop-blur overflow-hidden">
          <div className="flex items-center justify-between p-4 pb-3">
            <p className="text-sm font-bold">Legenda</p>
            <button
              onClick={() => setLegendMinimized(!legendMinimized)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              title={legendMinimized ? "Proširi legendu" : "Minimiziraj legendu"}
            >
              {legendMinimized ? (
                <ChevronUp className="w-4 h-4 text-dark-200" />
              ) : (
                <ChevronDown className="w-4 h-4 text-dark-200" />
              )}
            </button>
          </div>

          {!legendMinimized && (
            <>
              <div className="px-4 pb-4 space-y-2 text-xs text-dark-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400"></span>
                  <span>Pickup lokacija</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                  <span>Delivery lokacija</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/80 flex items-center justify-center text-white text-[10px] font-bold">D</div>
                  <span>Vozač (dostupan)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/80 flex items-center justify-center text-white text-[10px] font-bold">A</div>
                  <span>Vozač (aktivan load)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-purple-400"></span>
                  <span>Ruta loada</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-orange-400" style={{borderTop: '2px dashed #F59E0B'}}></span>
                  <span>Vozač → Pickup</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0.5 bg-green-400"></span>
                  <span>Pickup → Delivery</span>
                </div>
              </div>
              <div className="text-[11px] text-dark-300 px-4 pb-4 pt-3 border-t border-white/10">
                💡 Klikni na vozača ili load marker da vidiš detalje
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Load Info Panel - Bottom Right (above legend) */}
      {selectedLoadForPanel && loads.find(l => l.id === selectedLoadForPanel) && (
        <div className="absolute top-4 bottom-4 right-4 z-[1000] w-[420px] overflow-y-auto">
          {(() => {
            const load = loads.find(l => l.id === selectedLoadForPanel)!;
            const distanceKm = Math.round(load.distance);
            const customRatePerKm = load.customRatePerMile ?? null;
            const formatBAM = (value: number) =>
              new Intl.NumberFormat("bs-BA", { style: "currency", currency: "BAM" }).format(value);

            return (
              <div className="relative rounded-3xl bg-dark-900/95 text-white border border-white/10 shadow-soft-xl backdrop-blur p-4 h-full">
                <button
                  onClick={() => setSelectedLoadForPanel(null)}
                  className="absolute top-3 right-3 text-dark-300 hover:text-white transition-colors"
                >
                  ✕
                </button>

                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                  <div>
                    <p className="text-lg font-bold">{load.loadNumber}</p>
                    <span
                      className="inline-block mt-1 px-3 py-1 rounded-full text-[11px] font-semibold border"
                      style={{
                        backgroundColor: getStatusColor(load.status) + "20",
                        color: getStatusColor(load.status),
                        borderColor: getStatusColor(load.status) + "40",
                      }}
                    >
                      {getStatusLabel(load.status)}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-dark-200">
                    <p>Zakazano pickup:</p>
                    <p className="text-white font-semibold">
                      {new Date(load.scheduledPickupDate).toLocaleString("bs-BA")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* Pickup Info */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <p className="text-xs font-semibold text-emerald-200 mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Pickup
                    </p>
                    <p className="text-sm font-semibold">{load.pickupAddress}</p>
                    <p className="text-[11px] text-emerald-50">
                      {load.pickupCity}, {load.pickupState} {load.pickupZip}
                    </p>
                    <p className="text-[11px] text-emerald-100 mt-1">
                      Kontakt: {load.pickupContactName} - {load.pickupContactPhone}
                    </p>
                  </div>

                  {/* Delivery Info */}
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3">
                    <p className="text-xs font-semibold text-rose-200 mb-1 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span> Delivery
                    </p>
                    <p className="text-sm font-semibold">{load.deliveryAddress}</p>
                    <p className="text-[11px] text-rose-50">
                      {load.deliveryCity}, {load.deliveryState} {load.deliveryZip}
                    </p>
                    <p className="text-[11px] text-rose-100 mt-1">
                      Kontakt: {load.deliveryContactName} - {load.deliveryContactPhone}
                    </p>
                  </div>
                </div>

                {/* Driver & Truck Info */}
                {load.driver && (
                  <div className="mt-3 rounded-2xl border border-primary-500/30 bg-primary-500/10 p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/30 text-white flex items-center justify-center">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        Vozač: {load.driver.user.firstName} {load.driver.user.lastName}
                      </p>
                      {load.truck && (
                        <p className="text-[11px] text-primary-50">Kamion: {load.truck.truckNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Load Details */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-dark-100">
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[11px] text-dark-300">Udaljenost</p>
                    <p className="text-base font-bold text-white">{distanceKm} km</p>
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
                    <p className="text-[11px] text-dark-300">Cijena</p>
                    <p className="text-base font-bold text-white">{formatBAM(load.loadRate)}</p>
                  </div>
                  {load.customRatePerMile && (
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 col-span-2">
                      <p className="text-[11px] text-dark-300">Cijena po km</p>
                      <p className="text-base font-bold text-white">
                        {customRatePerKm ? formatBAM(customRatePerKm) : "-"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <a
                    href={`/loads/${load.id}`}
                    className="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors shadow-primary"
                  >
                    Vidi sve detalje →
                  </a>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
