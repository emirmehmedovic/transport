"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck, Package, Navigation } from "lucide-react";

// Component to control map view
function MapController({ selectedDriverId, driverLocations }: { selectedDriverId: string | null, driverLocations: DriverLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (selectedDriverId) {
      const driver = driverLocations.find(d => d.driverId === selectedDriverId);
      if (driver) {
        map.setView([driver.latitude, driver.longitude], 12, {
          animate: true,
          duration: 1,
        });
      }
    }
  }, [selectedDriverId, driverLocations, map]);

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

// Custom truck icon for drivers using SVG
const createDriverIcon = (driverName: string, hasLoad: boolean, isSelected: boolean = false) => {
  const iconColor = isSelected ? '#EF4444' : (hasLoad ? '#10B981' : '#3B82F6'); // Red if selected, Green if has load, blue if available
  
  return L.divIcon({
    html: `
      <div style="position: relative; text-align: center;">
        <div style="
          position: absolute;
          bottom: 48px;
          left: 50%;
          transform: translateX(-50%);
          background: ${iconColor};
          color: white;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          border: 2px solid white;
        ">
          ${driverName}
        </div>
        <div style="
          width: 40px;
          height: 40px;
          background: ${iconColor};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 3px solid white;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
            <path d="M15 18H9"></path>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
            <circle cx="17" cy="18" r="2"></circle>
            <circle cx="7" cy="18" r="2"></circle>
          </svg>
        </div>
      </div>
    `,
    className: 'custom-driver-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
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
}

interface DriverLocation {
  driverId: string;
  driverName: string;
  truckNumber: string | null;
  truckId: string | null;
  latitude: number;
  longitude: number;
  lastUpdate: string;
  loads: LoadInfo[];
}

interface LiveMapProps {
  selectedDriverId?: string | null;
}

export default function LiveMap({ selectedDriverId }: LiveMapProps = { selectedDriverId: null }) {
  const [loads, setLoads] = useState<LoadData[]>([]);
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [selectedLoadForPanel, setSelectedLoadForPanel] = useState<string | null>(null);
  const [driverRoutes, setDriverRoutes] = useState<Record<string, {
    toPickup: [number, number][];
    toDelivery: [number, number][];
  }>>({});
  const [loadRoutes, setLoadRoutes] = useState<Record<string, [number, number][]>>({});
  const [availableLoads, setAvailableLoads] = useState<LoadData[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      // Fetch active loads
      const loadsRes = await fetch("/api/loads?status=ASSIGNED,PICKED_UP,IN_TRANSIT");
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

      // Fetch driver locations
      const driversRes = await fetch("/api/drivers/location");
      const driversData = await driversRes.json();
      
      if (driversRes.ok && driversData.drivers) {
        const driverLocs = driversData.drivers.map((driver: any) => ({
          driverId: driver.id,
          driverName: `${driver.user.firstName} ${driver.user.lastName}`,
          truckNumber: driver.primaryTruck?.truckNumber || null,
          truckId: driver.primaryTruck?.id || null,
          latitude: driver.lastKnownLatitude,
          longitude: driver.lastKnownLongitude,
          lastUpdate: driver.lastLocationUpdate,
          loads: driver.loads || [],
        }));
        
        console.log("Driver locations:", driverLocs);
        setDriverLocations(driverLocs);
      }

      // Fetch available loads (not assigned)
      const availableLoadsRes = await fetch("/api/loads?status=AVAILABLE");
      const availableLoadsData = await availableLoadsRes.json();
      
      if (availableLoadsRes.ok && availableLoadsData.loads) {
        setAvailableLoads(availableLoadsData.loads);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching map data:", error);
      setLoading(false);
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

    try {
      // Route from driver to pickup
      const toPickupUrl = `https://router.project-osrm.org/route/v1/driving/${driver.longitude},${driver.latitude};${loadWithGPS.pickupLongitude},${loadWithGPS.pickupLatitude}?overview=full&geometries=geojson`;
      const toPickupRes = await fetch(toPickupUrl);
      const toPickupData = await toPickupRes.json();

      // Route from pickup to delivery
      const toDeliveryUrl = `https://router.project-osrm.org/route/v1/driving/${loadWithGPS.pickupLongitude},${loadWithGPS.pickupLatitude};${loadWithGPS.deliveryLongitude},${loadWithGPS.deliveryLatitude}?overview=full&geometries=geojson`;
      const toDeliveryRes = await fetch(toDeliveryUrl);
      const toDeliveryData = await toDeliveryRes.json();

      if (toPickupData.routes && toPickupData.routes[0] && toDeliveryData.routes && toDeliveryData.routes[0]) {
        const toPickupCoords = toPickupData.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );
        const toDeliveryCoords = toDeliveryData.routes[0].geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        setDriverRoutes(prev => ({
          ...prev,
          [driver.driverId]: {
            toPickup: toPickupCoords,
            toDelivery: toDeliveryCoords,
          }
        }));
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
      const routeUrl = `https://router.project-osrm.org/route/v1/driving/${load.pickupLongitude},${load.pickupLatitude};${load.deliveryLongitude},${load.deliveryLatitude}?overview=full&geometries=geojson`;
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
    const labels: Record<string, string> = {
      ASSIGNED: "Dodijeljen",
      PICKED_UP: "Preuzet",
      IN_TRANSIT: "U transportu",
      DELIVERED: "Isporučen",
    };
    return labels[status] || status;
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

  return (
    <div className="h-full w-full relative">
      {/* Map - Full Height */}
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
      >
          <MapController selectedDriverId={selectedDriverId || null} driverLocations={driverLocations} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render all loads */}
          {loads.map((load) => (
            <div key={load.id}>
              {/* Pickup Marker */}
              {load.pickupLatitude && load.pickupLongitude && (
                <Marker
                  key={load.id}
                  position={[load.pickupLatitude, load.pickupLongitude]}
                  icon={pickupIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedLoadForPanel(load.id);
                    },
                  }}
                />
              )}

              {/* Delivery Marker */}
              {load.deliveryLatitude && load.deliveryLongitude && (
                <Marker
                  position={[load.deliveryLatitude, load.deliveryLongitude]}
                  icon={deliveryIcon}
                  eventHandlers={{
                    click: () => {
                      setSelectedLoadForPanel(load.id);
                    },
                  }}
                />
              )}

              {/* Route Line - Use calculated route if available, otherwise direct line */}
              {load.pickupLatitude &&
                load.pickupLongitude &&
                load.deliveryLatitude &&
                load.deliveryLongitude && (
                  <Polyline
                    positions={
                      loadRoutes[load.id] || [
                        [load.pickupLatitude, load.pickupLongitude],
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
          {driverLocations.map((driver) => {
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
            const hasCalculatedRoute = driverRoutes[driver.driverId];

            return (
              <div key={`route-${driver.driverId}`}>
                {/* Driver's route to pickup and then to delivery */}
                {isSelected && loadWithGPS && hasCalculatedRoute && (
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
                  </>
                )}
              </div>
            );
          })}

          {/* Render driver locations */}
          {driverLocations.map((driver) => {
            const isSelected = selectedDriverId === driver.driverId;
            return (
              <Marker
                key={driver.driverId}
                position={[driver.latitude, driver.longitude]}
                icon={createDriverIcon(driver.driverName, driver.loads.length > 0, isSelected)}
                eventHandlers={{
                  click: async () => {
                    if (driver.driverId === selectedDriverId) {
                      // Deselect
                      setSelectedDriverId(null);
                    } else {
                      // Select and calculate route
                      setSelectedDriverId(driver.driverId);
                      if (!driverRoutes[driver.driverId]) {
                        await calculateDriverRoute(driver);
                      }
                    }
                  },
                }}
              />
            );
          })}
      </MapContainer>

      {/* Floating Driver Info Panel - Bottom Left */}
      {selectedDriverId && driverLocations.find(d => d.driverId === selectedDriverId) && (
        <div className="absolute top-4 bottom-4 left-4 z-[1000] w-[420px]">
          {(() => {
            const driver = driverLocations.find(d => d.driverId === selectedDriverId)!;
            const driverActive = driver.loads.length > 0;

            return (
              <div className="relative h-full rounded-3xl bg-dark-900/95 text-white border border-white/10 shadow-soft-xl backdrop-blur p-4 overflow-y-auto">
                <button
                  onClick={() => setSelectedDriverId(null)}
                  className="absolute top-3 right-3 text-dark-300 hover:text-white transition-colors"
                >
                  ✕
                </button>

                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/10">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-soft ${driverActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-electric-500/20 text-electric-100'}`}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-bold">{driver.driverName}</p>
                    <p className="text-xs text-dark-200">
                      {driver.truckNumber ? `Kamion ${driver.truckNumber}` : "Bez dodijeljenog kamiona"}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${driverActive ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40' : 'bg-electric-500/15 text-electric-100 border border-electric-500/40'}`}>
                    {driverActive ? 'Aktivan' : 'Dostupan'}
                  </span>
                </div>

                {/* Current Loads */}
                {driver.loads.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <p className="text-[11px] font-semibold text-dark-200 uppercase tracking-wide">
                      Aktivni loadovi ({driver.loads.length})
                    </p>
                    {driver.loads.map((load, index) => {
                      const isSelectedLoad = selectedLoadId === load.id;
                      const hasGPS = load.pickupLatitude && load.pickupLongitude && 
                                    load.deliveryLatitude && load.deliveryLongitude;

                      return (
                        <div
                          key={load.id}
                          className={`rounded-2xl p-3 cursor-pointer transition-all border ${isSelectedLoad ? 'bg-primary-500/10 border-primary-500/60' : 'bg-white/5 border-white/10 hover:border-primary-400/60'}`}
                          onClick={() => {
                            if (hasGPS) {
                              calculateDriverRoute(driver, load.id);
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
                              <p className="text-[11px] text-dark-300 mt-0.5">Status: {load.status}</p>
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

                {/* Assign Load */}
                <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-dark-200 uppercase tracking-wide">
                      {driver.loads.length === 0 ? "Dodijeli load" : "Dodaj dodatni load"}
                    </p>
                    <span className="text-[10px] text-dark-300">
                      Zadnja pozicija: {new Date(driver.lastUpdate).toLocaleTimeString("bs-BA")}
                    </span>
                  </div>

                  {availableLoads.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value && driver.truckId) {
                            const selectedLoad = availableLoads.find(l => l.id === e.target.value);
                            if (selectedLoad) {
                              if (driver.loads.length > 0) {
                                const loadsList = driver.loads.map(l => l.loadNumber).join(', ');
                                const confirmed = window.confirm(`Dodijeli ${selectedLoad.loadNumber} vozaču ${driver.driverName}?\n\nVozač već ima ${driver.loads.length} aktivnih loada: ${loadsList}`);
                                if (!confirmed) {
                                  e.target.value = "";
                                  return;
                                }
                              }
                              assignLoadToDriver(e.target.value, driver.driverId, driver.truckId);
                            }
                            e.target.value = "";
                          }
                        }}
                        disabled={assigning}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-dark-900 border border-white/15 text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">{driver.loads.length === 0 ? "Odaberi load..." : "Odaberi dodatni load..."}</option>
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
              </div>
            );
          })()}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[1000]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-dark-700">Učitavanje podataka...</span>
        </div>
      )}

      {/* Legend - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-[1000] max-w-xs">
        <div className="rounded-3xl bg-dark-900/95 text-white border border-white/10 shadow-soft-xl backdrop-blur p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Legenda</p>
            <span className="text-[11px] text-dark-200">Map key</span>
          </div>
          <div className="space-y-2 text-xs text-dark-100">
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
          <div className="text-[11px] text-dark-300 mt-3 pt-3 border-t border-white/10">
            💡 Klikni na vozača ili load marker da vidiš detalje
          </div>
        </div>
      </div>

      {/* Floating Load Info Panel - Bottom Right (above legend) */}
      {selectedLoadForPanel && loads.find(l => l.id === selectedLoadForPanel) && (
        <div className="absolute top-4 bottom-4 right-4 z-[1000] w-[420px] overflow-y-auto">
          {(() => {
            const load = loads.find(l => l.id === selectedLoadForPanel)!;
            const distanceKm = Math.round(load.distance * 1.60934);
            const customRatePerKm = load.customRatePerMile ? load.customRatePerMile / 1.60934 : null;
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
