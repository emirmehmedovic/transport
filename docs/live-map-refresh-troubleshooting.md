# Live Map Refresh - Troubleshooting & Solutions

## Problem

Live map ne osvježava pozicije vozača automatski iako GPS uređaj šalje nove lokacije.

## Root Cause

### 1. GPS Uređaj Šalje na Pogrešan URL

**Problem:** GPS uređaj je konfigurisan da šalje podatke na:
```
url = "https://transport-one-bay.vercel.app/api/telemetry"
```

To je **production URL**, ne lokalni development server!

**Rješenje:** Promijeni GPS konfiguraciju da šalje na:
- **Development:** `http://localhost:3000/api/telemetry`
- **Production:** `https://transport-one-bay.vercel.app/api/telemetry`

### 2. Dugačak Refresh Interval

**Problem:** Live map se osvježavala svakih 30 sekundi, što je presporo za real-time praćenje.

**Rješenje:** Skraćen interval na **5 sekundi**.

```typescript
// BEFORE: 30 seconds
const interval = setInterval(fetchData, 30000);

// AFTER: 5 seconds
const interval = setInterval(fetchData, 5000);
```

### 3. Nedostatak Vizuelnih Indikatora

**Problem:** Korisnik nije mogao da vidi:
- Kada se podaci osvježavaju
- Kada je vozač zadnji put bio viđen

**Rješenje:** Dodati indikatori:
- "Osvježavanje..." indicator tokom fetch-a
- "Ažurirano: Xs ago" badge
- "Last seen" timestamp za svakog vozača

---

## Rješenja Implementirana

### 1. Brži Auto-Refresh (5 sekundi)

```typescript
// components/maps/LiveMap.tsx
useEffect(() => {
  fetchData();
  const interval = setInterval(fetchData, 5000); // 5s
  return () => clearInterval(interval);
}, []);
```

### 2. Real-Time Indikatori

#### Global Refresh Indicator
```typescript
{/* Last Refresh Indicator */}
{!loading && lastRefresh && (
  <div className="...">
    <div className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
    <span>Ažurirano: {getTimeAgo(lastRefresh)}</span>
  </div>
)}
```

#### Per-Driver "Last Seen"
```typescript
<span title={new Date(driver.lastUpdate).toLocaleString("bs-BA")}>
  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
  {getTimeAgo(driver.lastUpdate)}
</span>
```

### 3. Helper Function: getTimeAgo()

```typescript
const getTimeAgo = (date: string | Date) => {
  const now = new Date().getTime();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
```

---

## Kako Testirati Lokalno

### Opcija 1: Koristi Simulator

Pokreni GPS simulator koji šalje pozicije na lokalni server:

```bash
chmod +x scripts/simulate-gps-updates.sh
./scripts/simulate-gps-updates.sh
```

Ovo će slati novu poziciju svakih 5 sekundi.

### Opcija 2: Manualno Slanje (cURL)

```bash
curl -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "kamion0001",
    "lat": 43.8563,
    "lon": 18.4131,
    "speed": 60,
    "bearing": 90
  }'
```

### Opcija 3: Promijeni GPS Konfiguraciju

U Background Geolocation plugin konfiguraciji, promijeni:

```javascript
// BEFORE (production)
url: "https://transport-one-bay.vercel.app/api/telemetry"

// AFTER (development)
url: "http://localhost:3000/api/telemetry"
// ili ako je mobilni uređaj na istoj mreži:
url: "http://YOUR_LOCAL_IP:3000/api/telemetry"
```

**Pronađi svoj local IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

---

## Flow Diagram

### Kako Radi Live Map Refresh

```
GPS Device → /api/telemetry
                ↓
         Save to Position table
                ↓
    Update Driver.lastKnownLatitude/Longitude
                ↓
         (every 5 seconds)
                ↓
   Live Map → GET /api/drivers/location
                ↓
        Fetch latest driver positions
                ↓
         Update map markers
                ↓
      Show "Ažurirano: Xs ago"
```

### Gdje se Podaci Čuvaju

```
GPS Telemetry → /api/telemetry
                      ↓
                ┌─────────────┐
                │   Position   │ (historija)
                │   - driverId │
                │   - lat/lon  │
                │   - timestamp│
                └─────────────┘
                      ↓
                ┌─────────────┐
                │    Driver    │ (trenutna pozicija)
                │   - lastKnownLatitude
                │   - lastKnownLongitude
                │   - lastLocationUpdate
                └─────────────┘
                      ↑
Live Map ← GET /api/drivers/location
```

---

## Provjera da li Radi

### 1. Otvori Live Map
http://localhost:3000/live-map

### 2. Pokreni GPS Simulator
```bash
./scripts/simulate-gps-updates.sh
```

### 3. Provjeri Indikatore

Trebao bi vidjeti:
- ✅ "Osvježavanje..." tokom fetch-a
- ✅ "Ažurirano: Xs ago" badge (mijenja se svakih 5s)
- ✅ Marker vozača se pomjera
- ✅ "Last seen" timestamp se ažurira

### 4. Provjeri Server Logs

```
[Telemetry] Position saved for device kamion0001 at (43.8563, 18.4131)
[LoadProximity] Auto-updated LOAD-XXX: ASSIGNED → PICKED_UP (347m from pickup)
```

### 5. Provjeri Database

```bash
npx prisma studio
```

Pogledaj:
- **Position** tabelu - nove pozicije svakih 5s
- **Driver** tabelu - `lastKnownLatitude/Longitude` se ažurira

---

## Production Setup

### 1. Environment Variables

Postavi različite URL-ove za dev/prod:

```env
# .env.local (development)
NEXT_PUBLIC_API_URL=http://localhost:3000

# .env.production
NEXT_PUBLIC_API_URL=https://transport-one-bay.vercel.app
```

### 2. GPS Konfiguracija

Koristi environment variable u GPS konfiguraciji:

```javascript
url: process.env.NEXT_PUBLIC_API_URL + "/api/telemetry"
```

### 3. CORS za Production

Ako GPS šalje iz mobile app, možda trebaš CORS:

```typescript
// app/api/telemetry/route.ts
export async function POST(request: NextRequest) {
  const response = await handleTelemetry(request);

  // Add CORS headers for mobile apps
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  return response;
}
```

---

## Performance Optimizations

### Opcija 1: WebSockets (Real-Time)

Za još bržu refresh bez polling-a:

```typescript
// Server-side (Next.js API route with WebSocket)
// Client-side (LiveMap component)
useEffect(() => {
  const ws = new WebSocket('ws://localhost:3000/api/ws');

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // Update driver position immediately
  };

  return () => ws.close();
}, []);
```

### Opcija 2: Server-Sent Events (SSE)

```typescript
// Client-side
useEffect(() => {
  const eventSource = new EventSource('/api/drivers/location/stream');

  eventSource.onmessage = (event) => {
    const update = JSON.parse(event.data);
    // Update driver positions
  };

  return () => eventSource.close();
}, []);
```

### Opcija 3: Optimized Polling

Trenutna implementacija (5s polling) je dobar kompromis između:
- Real-time updates
- Server load
- Battery drain (mobile)

---

## Troubleshooting

### "Ne vidim vozača na mapi"

✅ **Provjeri:**
1. Da li je driver.status = ACTIVE?
2. Da li driver ima lastKnownLatitude/Longitude?
3. Da li telemetry API uspješno čuva poziciju?

```sql
SELECT id, "lastKnownLatitude", "lastKnownLongitude", "lastLocationUpdate"
FROM "Driver"
WHERE "traccarDeviceId" = 'kamion0001';
```

### "Marker se ne pomjera"

✅ **Provjeri:**
1. Da li GPS uređaj šalje na pravi URL?
2. Da li telemetry API vraća 200 OK?
3. Da li se Position-i čuvaju u bazi?

```bash
# Test telemetry API
curl -X POST "http://localhost:3000/api/telemetry" \
  -H "Content-Type: application/json" \
  -d '{"id": "kamion0001", "lat": 43.8563, "lon": 18.4131}'
```

### "Ažurirano: X ago se ne mijenja"

✅ **Provjeri:**
1. Da li fetchData() se poziva svakih 5s?
2. Da li ima grešaka u console-u?
3. Da li API vraća nove podatke?

```javascript
// Chrome DevTools → Network tab
// Filter: /api/drivers/location
// Očekujem poziv svakih 5 sekundi
```

---

## Best Practices

### 1. Adjust Refresh Rate Based on Context

```typescript
// Heavy traffic: 5s
const REFRESH_INTERVAL_ACTIVE = 5000;

// Light traffic: 15s
const REFRESH_INTERVAL_IDLE = 15000;

// No drivers active: 30s
const REFRESH_INTERVAL_NONE = 30000;
```

### 2. Debounce Rapid Updates

```typescript
const debouncedFetch = useCallback(
  debounce(fetchData, 1000),
  []
);
```

### 3. Show Stale Data Warning

```typescript
if (getTimeSince(driver.lastUpdate) > 300) { // 5 min
  return <Badge color="red">Offline</Badge>;
}
```

### 4. Battery-Aware Updates

```typescript
// Reduce refresh rate if battery is low
if (battery < 20) {
  interval = 30000; // 30s
}
```

---

## Future Improvements

- [ ] WebSocket support za instant updates
- [ ] Offline indicator za vozače (> 5 min bez update-a)
- [ ] Historical playback (vidi gdje je vozač bio)
- [ ] Geofence alerts (notifikacije kada uđe/izađe iz zone)
- [ ] Speed alerts (prebrza vožnja)
- [ ] Route optimization suggestions

