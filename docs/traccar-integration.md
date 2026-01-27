# Traccar Client Integracija - Vodič za Implementaciju

## Pregled

Ova aplikacija sada podržava automatsko GPS praćenje vozača preko Traccar Client mobilne aplikacije. Traccar Client šalje GPS podatke sa telefona vozača direktno na naš server u OsmAnd formatu.

## Kako Radi

```
[Vozačev Telefon (Traccar Client)]
           ↓
    POST /api/telemetry
           ↓
   [Position baza podataka]
           ↓
[Ažuriranje Driver.lastKnownLocation]
           ↓
   [Live Map prikaz]
```

## 1. Database Schema

### Position Model (Nova Tabela)

Čuva kompletnu historiju GPS pozicija svakog vozača:

```prisma
model Position {
  id            String    @id @default(cuid())

  // Device Reference
  driverId      String
  driver        Driver    @relation(...)
  deviceId      String    // Traccar Device ID (npr. KAMION-01)

  // Location Data
  latitude      Float
  longitude     Float
  altitude      Float?
  speed         Float?    // km/h
  bearing       Float?    // Smjer u stupnjevima (0-360)
  accuracy      Float?    // Preciznost u metrima

  // Device Status
  battery       Float?    // Nivo baterije 0-100

  // Timestamp
  recordedAt    DateTime  // Kada je GPS zabilježio poziciju
  receivedAt    DateTime  // Kada je server primio podatke
}
```

### Driver Model (Proširenje)

Dodato polje `traccarDeviceId` za identifikaciju uređaja:

```prisma
model Driver {
  // ... existing fields ...

  traccarDeviceId       String?        @unique  // Device ID za Traccar Client
  positions             Position[]     // Historija pozicija
}
```

## 2. API Endpoints

### POST/GET `/api/telemetry`

**Prijem GPS podataka od Traccar Client aplikacije.**

Parametri (query string ili POST body):
- `id` ili `deviceid` - Device ID (obavezan) - npr. KAMION-01
- `lat` - Geografska širina (obavezan)
- `lon` - Geografska dužina (obavezan)
- `speed` - Brzina u km/h (opciono)
- `bearing` - Smjer u stupnjevima (opciono)
- `altitude` - Visina u metrima (opciono)
- `battery` ili `batt` - Nivo baterije u % (opciono)
- `accuracy` - Preciznost u metrima (opciono)
- `timestamp` - Unix timestamp ili ISO datum (opciono)

**Primjer requesta:**
```
GET /api/telemetry?id=KAMION-01&lat=44.53842&lon=18.66709&speed=65&battery=85
```

**Odgovor:**
```
200 OK
```

**Logika:**
1. Validira parametre (id, lat, lon su obavezni)
2. Pronalazi vozača po `traccarDeviceId`
3. Kreira novi Position record
4. Ažurira Driver.lastKnownLocation
5. Vraća 200 OK

### GET `/api/drivers/[id]/traccar`

Dohvaća Traccar konfiguraciju za vozača.

**Response:**
```json
{
  "driverId": "clxxx",
  "driverName": "Marko Marković",
  "traccarDeviceId": "KAMION-01",
  "isConfigured": true
}
```

### PUT `/api/drivers/[id]/traccar`

Postavlja ili ažurira Traccar Device ID za vozača.

**Request Body:**
```json
{
  "traccarDeviceId": "KAMION-01"
}
```

**Validacije:**
- Device ID mora biti jedinstven
- Ne može biti dupliciran između vozača
- Samo ADMIN može mijenjati

### DELETE `/api/drivers/[id]/traccar`

Uklanja Traccar Device ID od vozača.

### GET `/api/drivers/[id]/positions`

Dohvaća historiju pozicija za vozača.

**Query parametri:**
- `startDate` - ISO datum (default: prije 24h)
- `endDate` - ISO datum (default: sad)
- `limit` - Broj zapisa (default: 100, max: 1000)

**Response:**
```json
{
  "driver": {
    "id": "clxxx",
    "name": "Marko Marković",
    "traccarDeviceId": "KAMION-01"
  },
  "period": {
    "startDate": "2026-01-26T00:00:00Z",
    "endDate": "2026-01-27T00:00:00Z"
  },
  "statistics": {
    "totalPositions": 287,
    "avgSpeed": 58.3,
    "totalDistance": 456.7
  },
  "positions": [
    {
      "id": "clxxx",
      "latitude": 44.53842,
      "longitude": 18.66709,
      "speed": 65,
      "bearing": 270,
      "battery": 85,
      "recordedAt": "2026-01-27T12:30:00Z"
    }
  ]
}
```

## 3. Setup Proces

### Korak 1: Database Migration

Migracija je već kreirana u schema.prisma. Za primjenu:

```bash
npx prisma migrate deploy
npx prisma generate
```

### Korak 2: Konfiguracija Vozača

Za svakog vozača:

1. Admin ide u Vozači → [Ime Vozača] → Edit
2. Unosi Traccar Device ID (npr. `KAMION-01`)
3. Sprema promjene

### Korak 3: Instalacija Traccar Client

**Android:**

1. Instaliraj "Traccar Client" iz Google Play Store
2. Otvori aplikaciju
3. Settings:
   - **Device identifier**: `KAMION-01` (ID koji ste postavili u aplikaciji)
   - **Server URL**: `https://vasa-domena.com`
   - **Location accuracy**: `High`
   - **Frequency**: `300` (5 minuta)
4. Isključi Battery Optimization:
   - Settings → Apps → Traccar Client → Battery → Unrestricted
5. Omogući Autostart (ako postoji opcija)
6. Klikni START za početak praćenja

**iOS:**

1. Instaliraj "Traccar Client" iz App Store
2. Otvori aplikaciju
3. Settings:
   - **Device identifier**: `KAMION-01`
   - **Server URL**: `https://vasa-domena.com`
   - **Location accuracy**: `Medium` (ne High - štedi bateriju)
   - **Frequency**: `300` (5 minuta)
4. Dozvoli "Always" location access
5. Klikni START

### Korak 4: Testiranje

```bash
# Test sa curl-om
curl "https://vasa-domena.com/api/telemetry?id=KAMION-01&lat=44.53842&lon=18.66709&speed=45&battery=90"

# Provjeri bazu
npx prisma studio
# Otvori Position tabelu i provjeri da li postoje novi zapisi
```

## 4. Integracija sa Postojećim Funkcijama

### Live Map

Live Map automatski koristi `Driver.lastKnownLocation` koje Traccar ažurira, tako da će odmah raditi sa novim podacima.

### Position History

Novi endpoint `/api/drivers/[id]/positions` omogućava prikaz:
- Historije putovanja
- Ruta na mapi
- Statistika (ukupna udaljenost, prosječna brzina)
- Timeline prikaz

### Alerts

Možete dodati alert sistem koji prati:
- Vozače offline > 30 min
- Brzinu preko limita
- Neobične rute
- Niske baterije

## 5. Maintenance i Monitoring

### Praćenje Offline Vozača

Kreirajte cron job koji provjerava vozače bez nedavnih pozicija:

```sql
SELECT
  d.id,
  u.firstName,
  u.lastName,
  d.lastLocationUpdate,
  d.traccarDeviceId
FROM "Driver" d
JOIN "User" u ON d."userId" = u.id
WHERE
  d."traccarDeviceId" IS NOT NULL
  AND d."lastLocationUpdate" < NOW() - INTERVAL '30 minutes'
  AND d.status = 'ACTIVE';
```

### Čišćenje Starih Podataka

Position tabela će brzo rasti. Preporučeno je čišćenje starih zapisa:

```sql
-- Obriši pozicije starije od 90 dana
DELETE FROM "Position"
WHERE "recordedAt" < NOW() - INTERVAL '90 days';
```

Ili kreirajte retention policy sa Postgres job schedulerima.

### Monitoring Database Size

```sql
SELECT
  pg_size_pretty(pg_total_relation_size('"Position"')) as size,
  COUNT(*) as record_count
FROM "Position";
```

## 6. Troubleshooting

### Problem: Vozač ne šalje podatke

**Provjere:**
1. Da li je Traccar Device ID pravilno postavljen?
   ```bash
   # Provjeri u bazi
   SELECT "traccarDeviceId" FROM "Driver" WHERE id = 'xxx';
   ```

2. Da li je aplikacija pokrenuta na telefonu?
   - Android: Provjeri Notifications (treba pokazati "Tracking active")
   - iOS: Provjeri da li je app u background-u

3. Da li ima internet konekcije?

4. Da li su Battery Optimization isključeni (Android)?

5. Provjeri logs:
   ```bash
   # Na serveru
   tail -f logs/application.log | grep Telemetry
   ```

### Problem: Duplicate Device ID Error

Dva vozača ne mogu imati isti Device ID.

**Rješenje:**
```sql
-- Pronađi duplikate
SELECT "traccarDeviceId", COUNT(*)
FROM "Driver"
WHERE "traccarDeviceId" IS NOT NULL
GROUP BY "traccarDeviceId"
HAVING COUNT(*) > 1;
```

### Problem: Pozicije se ne prikazuju na mapi

1. Provjeri da li Position zapisi postoje:
   ```sql
   SELECT * FROM "Position"
   WHERE "driverId" = 'xxx'
   ORDER BY "recordedAt" DESC
   LIMIT 5;
   ```

2. Provjeri da li je `Driver.lastKnownLocation` ažuriran:
   ```sql
   SELECT
     "lastKnownLatitude",
     "lastKnownLongitude",
     "lastLocationUpdate"
   FROM "Driver"
   WHERE id = 'xxx';
   ```

## 7. Optimizacije

### Index Performance

Dodajte composite index za česte upite:

```sql
CREATE INDEX idx_position_driver_time
ON "Position"("driverId", "recordedAt" DESC);
```

### Caching

Cacheirajte zadnje pozicije vozača u Redisu:

```typescript
// Pseudo-kod
const lastPosition = await redis.get(`driver:${driverId}:lastPosition`);
if (!lastPosition) {
  // Fetch from DB
  await redis.set(
    `driver:${driverId}:lastPosition`,
    position,
    'EX',
    300
  ); // 5 min TTL
}
```

## 8. Sigurnost

### Rate Limiting

Dodajte rate limiting na `/api/telemetry`:

```typescript
// middleware.ts
if (pathname === '/api/telemetry') {
  const ip = request.ip;
  const rateLimit = await checkRateLimit(ip, 100, 60); // 100 req/min
  if (!rateLimit.ok) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

### Authentication

`/api/telemetry` endpoint ne zahtijeva JWT token jer Traccar Client ne može slati custom headers. Umjesto toga:

1. **Device ID validation** - Provjera da li postoji u bazi
2. **IP whitelisting** (opciono) - Ako vozači imaju statičke IP-ove
3. **Anomaly detection** - Praćenje neobičnih obrazaca

## 9. Buduća Proširenja

### Geofencing

Dodajte zone i alerte kada vozač uđe/izađe:

```typescript
const zones = [
  { name: 'Depo', lat: 44.x, lon: 18.x, radius: 500 }, // metara
  { name: 'Pickup zona', lat: 45.x, lon: 19.x, radius: 1000 },
];

// U telemetry endpoint-u
for (const zone of zones) {
  if (isInsideZone(latitude, longitude, zone)) {
    // Trigger event
  }
}
```

### Route Replay

Kreirajte UI za replay historije rute:

```typescript
// GET /api/drivers/[id]/positions?startDate=xxx&endDate=xxx
// Prikazi na mapi sa animacijom
```

### ETA Calculation

Koristite historijske podatke za bolji ETA:

```typescript
const avgSpeed = calculateAvgSpeedOnRoute(driverId, routeSegment);
const eta = distanceRemaining / avgSpeed;
```

### Predictive Maintenance

Analizirajte obrasce vožnje:
- Agresivno kočenje
- Brza ubrzanja
- Prekoračenja brzine
- Vrijeme vožnje vs. odmora

## 10. Zaključak

Traccar integracija omogućava:
- ✅ Automatsko GPS praćenje bez ručnog unosa
- ✅ Kompletnu historiju putovanja
- ✅ Real-time praćenje na mapi
- ✅ Statistiku i analize
- ✅ Alerts i notifikacije
- ✅ Compliance tracking

**Next steps:**
1. Deploy schema promjene na produkciju
2. Konfiguriši Device ID-eve za vozače
3. Instaliraj Traccar Client na telefone
4. Testiraj sa jednim vozačem 24h
5. Rollout na sve vozače
6. Dodaj alert sistem za offline vozače
7. Implementiraj data retention policy
