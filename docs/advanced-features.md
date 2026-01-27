# Advanced Features - Vodič za Implementaciju

Ovaj dokument opisuje tri napredne funkcionalnosti koje proširuju Traccar GPS tracking sistem:

1. **Geofencing** - Zone i alerte za ulazak/izlazak
2. **Route Replay** - Vizualizacija historijskih ruta
3. **Smart ETA** - Inteligentna kalkulacija vremena dolaska

---

## 1. GEOFENCING SISTEM

### Pregled

Geofencing omogućava definisanje geografskih zona i automatsko praćenje kada vozač uđe ili izađe iz zone.

### Database Schema

**Zone Model:**
```prisma
model Zone {
  id          String   @id @default(cuid())
  name        String
  description String?

  // Geographic area (circular zone)
  centerLat Float
  centerLon Float
  radius    Int // meters

  // Zone type and settings
  type      ZoneType @default(CUSTOM)
  isActive  Boolean  @default(true)

  // Notification settings
  notifyOnEntry Boolean @default(true)
  notifyOnExit  Boolean @default(true)

  // Associated load (optional)
  loadId String?

  events GeofenceEvent[]
}

enum ZoneType {
  PICKUP          // Pickup location zone
  DELIVERY        // Delivery location zone
  DEPOT           // Company depot/yard
  REST_AREA       // Rest area
  BORDER_CROSSING // Border crossing
  CUSTOM          // Custom zone
}
```

**GeofenceEvent Model:**
```prisma
model GeofenceEvent {
  id String @id @default(cuid())

  zoneId   String
  zone     Zone   @relation(...)

  driverId String
  driver   Driver @relation(...)

  eventType    GeofenceEventType
  latitude     Float
  longitude    Float
  speed        Float?
  detectedAt   DateTime

  notificationSent Boolean @default(false)
}

enum GeofenceEventType {
  ENTRY
  EXIT
}
```

### API Endpoints

#### `GET /api/zones`
Dohvati sve geofence zone.

**Query parametri:**
- `type` - Filter po tipu zone (PICKUP, DELIVERY, itd.)
- `isActive` - Filter po aktivnosti (true/false)

**Response:**
```json
{
  "zones": [
    {
      "id": "clxxx",
      "name": "Warehouse Sarajevo",
      "type": "DEPOT",
      "centerLat": 43.8563,
      "centerLon": 18.4131,
      "radius": 500,
      "isActive": true,
      "_count": {
        "events": 42
      }
    }
  ]
}
```

#### `POST /api/zones`
Kreiraj novu geofence zonu.

**Request Body:**
```json
{
  "name": "Pickup Zone - Client A",
  "description": "Glavni pickup point za klijenta A",
  "centerLat": 43.8563,
  "centerLon": 18.4131,
  "radius": 300,
  "type": "PICKUP",
  "notifyOnEntry": true,
  "notifyOnExit": true,
  "loadId": "clxxx" // optional
}
```

**Validacije:**
- Koordinate: -90 ≤ lat ≤ 90, -180 ≤ lon ≤ 180
- Radius: 10m ≤ radius ≤ 50km
- name je obavezan

#### `GET /api/zones/[id]`
Dohvati detalje zone sa nedavnim događajima.

**Response:**
```json
{
  "zone": {
    "id": "clxxx",
    "name": "Warehouse Sarajevo",
    "type": "DEPOT",
    "centerLat": 43.8563,
    "centerLon": 18.4131,
    "radius": 500,
    "events": [
      {
        "id": "clxxx",
        "eventType": "ENTRY",
        "detectedAt": "2026-01-27T14:30:00Z",
        "driver": {
          "user": {
            "firstName": "Marko",
            "lastName": "Marković"
          }
        }
      }
    ]
  }
}
```

#### `PUT /api/zones/[id]`
Ažuriraj zonu.

#### `DELETE /api/zones/[id]`
Obriši zonu (i sve događaje vezane za nju).

### Automatska Detekcija

Geofence provjera se automatski izvršava u `/api/telemetry` endpoint-u:

```typescript
// U telemetry/route.ts
import { checkGeofences } from '@/lib/geofence';

// Nakon što se sačuva pozicija
checkGeofences(driver.id, latitude, longitude, speed).catch((error) => {
  console.error('[Telemetry] Geofence check failed:', error);
});
```

**Logika detekcije:**

1. Dohvati sve aktivne zone
2. Dohvati zadnju poziciju vozača
3. Za svaku zonu:
   - Provjeri da li je trenutno unutra (distance ≤ radius)
   - Provjeri da li je ranije bio unutra
   - Ako ENTRY: ranije NIJE bio, sada JESTE
   - Ako EXIT: ranije JESTE bio, sada NIJE
4. Kreiraj GeofenceEvent za svaki ulazak/izlazak

### Automatsko Kreiranje Zona iz Loada

```typescript
import { createZoneFromLoad } from '@/lib/geofence';

// Kreiraj pickup zonu
await createZoneFromLoad(loadId, 'PICKUP');

// Kreiraj delivery zonu
await createZoneFromLoad(loadId, 'DELIVERY');
```

Default radius: 500m

### Use Cases

**1. Praćenje pickup/delivery dolazaka:**
- Automatski kreiraj zone za svaki load
- Alert kada vozač uđe u pickup zonu
- Alert kada vozač izađe iz delivery zone

**2. Compliance praćenje:**
- Definiši BORDER_CROSSING zone
- Praćenje vremena zadržavanja na granici
- Detektuj neovlaštene rute

**3. Depot management:**
- DEPOT zone za praćenje kada vozači dolaze/odlaze
- Automatski time tracking za shift-ove

**4. Rest area monitoring:**
- REST_AREA zone za praćenje pauza
- Compliance sa hours-of-service regulations

### Najbolje Prakse

1. **Radius sizing:**
   - Pickup/Delivery: 300-500m
   - Depot: 200-300m
   - Border crossing: 1-2km
   - Rest areas: 500m-1km

2. **Notifikacije:**
   - `notifyOnEntry=true, notifyOnExit=false` za pickup
   - `notifyOnEntry=false, notifyOnExit=true` za delivery
   - Oba za depot/border crossings

3. **Performance:**
   - Ne kreiraj prevelik broj zona (< 100 aktivnih)
   - Koristi `isActive=false` za stare zone umjesto brisanja

---

## 2. ROUTE REPLAY

### Pregled

Route Replay omogućava vizualizaciju historijskih ruta vozača sa playback kontrolama.

### Komponente

**RouteReplayMap.tsx:**
- Leaflet mapa sa route polyline
- Playback controls (play, pause, reset)
- Speed control (0.5x, 1x, 2x, 5x)
- Timeline slider
- Real-time stats display

**Page: `/drivers/[id]/replay`**
- Date range picker
- Statistics display
- GPX export功能ionalnost

### Kako Koristiti

1. Navigiraj na `/drivers/[driverId]/replay`
2. Odaberi datum range
3. Klikni "Pretraži"
4. Koristi playback kontrole:
   - Play/Pause
   - Reset (vrati na početak)
   - Rewind/Forward (±10 pozicija)
   - Speed selector (0.5x do 5x)
   - Timeline slider (direct seek)

### API Endpoint

`GET /api/drivers/[id]/positions` (već postoji)

**Query parametri:**
- `startDate` - ISO date (default: prije 24h)
- `endDate` - ISO date (default: sada)
- `limit` - Max zapisa (default: 100, max: 1000)

**Response:**
```json
{
  "driver": {
    "id": "clxxx",
    "name": "Marko Marković"
  },
  "period": {
    "startDate": "2026-01-26T00:00:00Z",
    "endDate": "2026-01-27T23:59:59Z"
  },
  "statistics": {
    "totalPositions": 287,
    "avgSpeed": 62.3,
    "totalDistance": 456.7
  },
  "positions": [
    {
      "id": "clxxx",
      "latitude": 43.8563,
      "longitude": 18.4131,
      "speed": 65,
      "bearing": 270,
      "battery": 85,
      "recordedAt": "2026-01-27T12:30:00Z"
    }
  ]
}
```

### Features

**1. Map Visualization:**
- Polyline showing travelled route
- Start marker (green)
- Current position marker (animated)
- End marker (red, when replay complete)

**2. Playback Controls:**
- Real-time animation
- Adjustable speed (0.5x to 5x)
- Jump forward/backward 10 positions
- Seek anywhere via timeline slider

**3. Stats Display:**
- Current timestamp
- Current speed
- Current bearing
- Battery level

**4. GPX Export:**
- Export route as GPX file
- Compatible with Google Earth, Garmin, etc.
- Includes speed data

### Use Cases

**1. Incident Investigation:**
- Replay route before accident
- Check speed and location

**2. Route Optimization:**
- Analyze actual vs planned routes
- Identify inefficiencies

**3. Compliance:**
- Verify driver followed authorized route
- Check for unauthorized stops

**4. Customer Service:**
- Show proof of delivery route
- Timeline of pickup/delivery

---

## 3. SMART ETA CALCULATION

### Pregled

Smart ETA koristi historijske GPS podatke za preciznu kalkulaciju vremena dolaska, uzimajući u obzir:
- Vrijeme dana (jutro, popodne, večer, noć)
- Dan u sedmici (radni dan vs vikend)
- Nedavne brzine vozača
- Historijske prosječne brzine

### API Endpoint

`GET /api/loads/[id]/eta`

**Response:**
```json
{
  "eta": {
    "pickup": {
      "distanceKm": 45.3,
      "estimatedSpeed": 68,
      "etaMinutes": 40,
      "etaDate": "2026-01-27T15:10:00Z",
      "confidence": "HIGH"
    },
    "delivery": null,
    "currentPhase": "TO_PICKUP"
  }
}
```

**Phases:**
- `TO_PICKUP` - Vozač ide prema pickup-u
- `TO_DELIVERY` - Vozač ide prema delivery-ju
- `DELIVERED` - Load je dostavljen

**Confidence Levels:**
- `HIGH` - Baziran na nedavnim (< 30min) i historijskim podacima
- `MEDIUM` - Neke nedavne podatke, uglavnom historijski
- `LOW` - Samo historijski podaci

### Komponenta

**ETADisplay.tsx:**

```tsx
import ETADisplay from '@/components/loads/ETADisplay';

<ETADisplay
  loadId="clxxx"
  autoRefresh={true}
  refreshInterval={60000} // 1 minute
/>
```

**Features:**
- Auto-refresh (default: 1min)
- Visual confidence indicator
- Progress bar
- Distance, speed, time display

### Algoritam

**1. Calculate Distance:**
```typescript
// Haversine formula
const distance = calculateDistance(
  currentLat, currentLon,
  destLat, destLon
);

// Apply road network factor (roads aren't straight)
const roadDistance = distance * 1.25; // +25%
```

**2. Determine Time Patterns:**
```typescript
const timeOfDay = getTimeOfDay(now); // MORNING, AFTERNOON, EVENING, NIGHT
const dayType = getDayType(now);     // WEEKDAY, WEEKEND
```

**3. Get Historical Average Speed:**
```typescript
const historicalSpeed = await calculateHistoricalAverageSpeed(driverId, {
  timeOfDay: 'AFTERNOON',
  dayType: 'WEEKDAY',
  daysBack: 30
});
```

**4. Blend with Recent Speed:**
```typescript
// Last 30 minutes of positions
const recentPositions = getRecentPositions(driverId, 30);

if (recentPositions.length >= 5) {
  // High confidence - use weighted average
  estimatedSpeed = recentSpeed * 0.7 + historicalSpeed * 0.3;
  confidence = 'HIGH';
} else if (recentPositions.length > 0) {
  // Medium confidence
  estimatedSpeed = recentSpeed * 0.5 + historicalSpeed * 0.5;
  confidence = 'MEDIUM';
} else {
  // Low confidence - historical only
  estimatedSpeed = historicalSpeed;
  confidence = 'LOW';
}
```

**5. Calculate ETA:**
```typescript
const etaHours = roadDistance / estimatedSpeed;
const etaMinutes = Math.round(etaHours * 60);
const etaDate = new Date(now.getTime() + etaMinutes * 60 * 1000);
```

### Optimizacije

**1. Safety Bounds:**
```typescript
// Realistic speed range
estimatedSpeed = Math.max(30, Math.min(90, estimatedSpeed));
```

**2. Pattern Matching:**
- Jutro (6-12h): Često sporije (gradski saobraćaj)
- Popodne (12-18h): Optimalna brzina
- Večer (18-22h): Sporije
- Noć (22-6h): Brže (manje saobraćaja)

**3. Day Type:**
- Vikend: Obično brže (manje kamiona)
- Radni dan: Sporije (više saobraćaja)

### Use Cases

**1. Customer Communication:**
- Realistične ETA poruke
- "Vozač će stići za ~45 minuta"

**2. Dispatcher Planning:**
- Planiranje sljedećih pickup-a
- Optimizacija ruta

**3. Load Scheduling:**
- Realistični delivery windows
- Prepoznavanje kašnjenja ranije

**4. Performance Tracking:**
- ETA accuracy over time
- Driver speed patterns

### Integracija

**U Load Details Page:**

```tsx
import ETADisplay from '@/components/loads/ETADisplay';

// Prikazi ETA ako je load ASSIGNED ili PICKED_UP
{(load.status === 'ASSIGNED' || load.status === 'PICKED_UP') && (
  <ETADisplay loadId={load.id} />
)}
```

**U Dashboard:**

```tsx
// Top urgent loads sa ETA
const urgentLoads = loads
  .filter(l => l.status === 'PICKED_UP')
  .map(async (load) => {
    const eta = await calculateLoadETA(load.id);
    return { ...load, eta };
  });
```

---

## DEPLOYMENT

### 1. Database Migration

```bash
# Apply schema changes
npx prisma migrate deploy
npx prisma generate
```

### 2. Environment Variables

Nema novih environment variables potrebnih.

### 3. Testing

**Geofencing:**
```bash
# 1. Kreiraj test zonu
curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Zone",
    "centerLat": 43.8563,
    "centerLon": 18.4131,
    "radius": 500,
    "type": "CUSTOM"
  }'

# 2. Simuliraj telemetry sa pozicijom u zoni
curl "http://localhost:3000/api/telemetry?id=KAMION-01&lat=43.8565&lon=18.4130"

# 3. Provjeri event-e
curl http://localhost:3000/api/zones/[zoneId]
```

**Route Replay:**
- Navigiraj na `/drivers/[id]/replay`
- Odaberi datum range sa pozicijama
- Testiraj playback kontrole

**Smart ETA:**
```bash
# Provjeri ETA za load
curl http://localhost:3000/api/loads/[loadId]/eta
```

### 4. Monitoring

**Geofence Events:**
```sql
-- Broj event-a po zoni (dnevno)
SELECT
  z.name,
  COUNT(*) as events_today
FROM "GeofenceEvent" ge
JOIN "Zone" z ON ge."zoneId" = z.id
WHERE ge."detectedAt" > NOW() - INTERVAL '24 hours'
GROUP BY z.name
ORDER BY events_today DESC;
```

**ETA Accuracy:**
```sql
-- Uporedi predicted vs actual delivery times
SELECT
  l."loadNumber",
  l."actualDeliveryDate" - l."scheduledDeliveryDate" as delay
FROM "Load" l
WHERE l.status = 'DELIVERED'
  AND l."actualDeliveryDate" IS NOT NULL
ORDER BY l."actualDeliveryDate" DESC
LIMIT 20;
```

---

## TROUBLESHOOTING

### Geofencing

**Problem: Eventi se ne kreiraju**

Provjeri:
1. Da li je zona aktivna (`isActive = true`)?
2. Da li je `notifyOnEntry`/`notifyOnExit` uključen?
3. Da li je radius dovoljno veliki?
4. Da li telemetry prima podatke?

```sql
-- Provjeri aktivne zone
SELECT * FROM "Zone" WHERE "isActive" = true;

-- Provjeri zadnje pozicije
SELECT * FROM "Position"
ORDER BY "recordedAt" DESC
LIMIT 10;
```

### Route Replay

**Problem: Nema pozicija za prikaz**

Provjeri:
1. Da li vozač ima `traccarDeviceId` postavljen?
2. Da li su pozicije u odabranom datum range-u?
3. Da li je limit dovoljno visok?

```sql
-- Provjeri pozicije za vozača
SELECT COUNT(*), MIN("recordedAt"), MAX("recordedAt")
FROM "Position"
WHERE "driverId" = 'clxxx';
```

### Smart ETA

**Problem: Niska preciznost (LOW confidence)**

Uzroci:
- Vozač nema dovoljno historijskih podataka
- Vozač nije vozio u zadnjih 30 minuta
- Novi vozač bez historije

Rješenje:
- Sačekaj da se akumulira više podataka (7-14 dana)
- Koristi default speeds (80 km/h highway)

---

## FUTURE ENHANCEMENTS

### Geofencing

1. **Polygon Zones** - Umjesto kružnih, proizvoljni oblici
2. **Speed Alerts** - Alert ako vozač prebrzo vozi u zoni
3. **Dwell Time** - Praćenje koliko dugo je vozač u zoni
4. **Zone Scheduling** - Aktivne zone samo u određeno vrijeme

### Route Replay

1. **Multi-driver Replay** - Prikaz više vozača simultano
2. **Heat Maps** - Gdje vozači provode najviše vremena
3. **Speed Zones** - Color-coded route segments po brzini
4. **Export to Video** - Kreiraj MP4 animaciju rute

### Smart ETA

1. **Traffic Integration** - Google Traffic API
2. **Weather Conditions** - Adjust za snijeg/kišu
3. **Machine Learning** - Predict delays based on patterns
4. **Multi-stop Routes** - ETA za više destinacija

---

## ZAKLJUČAK

Sva tri feature-a omogućavaju:

✅ **Geofencing**
- Automatsko praćenje zona
- Compliance alerts
- Pickup/delivery tracking

✅ **Route Replay**
- Incident investigation
- Route optimization
- Customer proof

✅ **Smart ETA**
- Realistične prognoze
- Pattern-based predictions
- High confidence estimates

**Next Steps:**
1. Deploy schema promjene
2. Kreiraj test zone
3. Testiraj route replay
4. Integriši ETA u dashboard
5. Prati accuracy metrics
