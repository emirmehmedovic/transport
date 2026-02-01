# NTS International GPS Integration Setup

## 📋 Pregled

Tvoj GPS tracking sistem (NTS International) već ima API koji dashboard koristi. Ne trebaš kontaktirati firmu - možeš odmah integrirati!

## 🔐 KORAK 1: Ekstraktuj Authentication Credentials

### 1.1 Otvori NTS Dashboard
```
https://app.nts-international.net/
```

### 1.2 Otvori Browser DevTools
- **Chrome/Edge**: `F12` ili `Ctrl+Shift+I`
- **Firefox**: `F12`
- **Safari**: `Cmd+Option+I`

### 1.3 Idi na Network Tab
1. Klikni na "Network" tab
2. Refresh stranicu (`F5`)
3. U filteru traži: `getTCPData`
4. Klikni na taj request

### 1.4 Kopiraj Headers
U desnom panelu, klikni "Headers" → traži ove vrijednosti:

```
Request Headers:
  Cookie: JSESSIONID=ABC123XYZ; authToken=DEF456...
  Authorization: Bearer TOKEN_HERE (ako postoji)
  User-Agent: Mozilla/5.0...
```

**IMPORTANT:** Kopiraj **cijeli** `Cookie` header!

## 🛠️ KORAK 2: Konfiguriši Environment Variables

### 2.1 Otvori `.env` fajl

Dodaj ove linije:

```env
# NTS International GPS API
NTS_API_URL=https://app.nts-international.net/NTSWeb/vehicle/getTCPData
NTS_SERVER=.SERVER_98
NTS_AUTH_COOKIE="JSESSIONID=tvoj-session-id; authToken=tvoj-token"

# Alternative: if they use Bearer token
# NTS_AUTH_TOKEN=your-bearer-token-here
```

**Zamijeni sa svojim credentials!**

### 2.2 Zaštiti .env fajl

Provjeri da `.env` fajl nije u git-u:

```bash
# .gitignore already has this, but verify:
cat .gitignore | grep .env
```

## 📦 KORAK 3: Update Database Schema

```bash
# Run migration to add ntsDeviceId field to Truck model
npx prisma db push
```

Ovo dodaje `ntsDeviceId` polje u Truck tabelu.

## 🔗 KORAK 4: Mapiranje Vozila

### 4.1 Dohvati Device ID-eve iz NTS-a

Iz Network tab odgovora, vidi `id` za svako vozilo:

```json
{
  "id": 39809,  // <-- Ovo je NTS Device ID
  "gpsLat": 44.2594,
  "gpsLon": 18.72074,
  ...
}
```

### 4.2 Dodaj Device ID u Trucks

Za svaki kamion u tvom sistemu, unesi NTS Device ID:

**Opcija A: Ručno u bazi**
```sql
UPDATE "Truck"
SET "ntsDeviceId" = '39809'
WHERE "truckNumber" = 'KAMION-001';

UPDATE "Truck"
SET "ntsDeviceId" = '39816'
WHERE "truckNumber" = 'KAMION-002';
```

**Opcija B: Preko admin UI (TODO - kreirati formu)**

## 🧪 KORAK 5: Testiranje

### 5.1 Testiraj Debug Endpoint

```bash
# Check current positions in database
curl http://localhost:3000/api/debug/positions
```

### 5.2 Ručno Pokreni Sync

Kao admin user, pozovi:

```bash
curl -X POST http://localhost:3000/api/sync-gps \
  -H "Cookie: token=your-admin-token"
```

Ili iz browsera (mora biti ulogovan kao admin):
```javascript
fetch('/api/sync-gps', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### 5.3 Provjeri Logove

U terminalu gdje radi `npm run dev`, trebao bi vidjeti:

```
[NTS Sync] Fetching vehicle data from NTS API...
[NTS Sync] Received 70 vehicles
[NTS Sync] ✓ Saved position for truck KAMION-001 (44.2594, 18.72074)
[NTS Sync] ✓ Saved position for truck KAMION-002 (43.8881, 18.3818)
[NTS Sync] ✓ Sync completed: 2/70 positions saved
```

## ⚙️ KORAK 6: Automatsko Sinhronizovanje

### 6.1 Kreiraj Background Job Script

```bash
# Create script file
touch scripts/gps-sync-worker.ts
```

```typescript
// scripts/gps-sync-worker.ts
import { startNTSAutoSync } from '@/lib/nts-gps-sync';

console.log('Starting GPS sync worker...');

// Sync every 2 minutes
startNTSAutoSync(2);

// Keep process alive
process.on('SIGINT', () => {
  console.log('GPS sync worker stopped');
  process.exit(0);
});
```

### 6.2 Dodaj u package.json

```json
{
  "scripts": {
    "gps-sync": "tsx scripts/gps-sync-worker.ts"
  }
}
```

### 6.3 Pokreni Worker

```bash
# U novom terminal tab-u
npm run gps-sync
```

Ili koristi **PM2** za production:

```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start npm --name "gps-sync" -- run gps-sync

# Check status
pm2 status

# View logs
pm2 logs gps-sync
```

## 📊 Mapiranje Podataka

### NTS API → Naša Baza

```javascript
NTS Field           → Our Database Field
------------------     --------------------
id                  → truck.ntsDeviceId (mapping)
gpsGMT              → position.recordedAt
gpsLat              → position.latitude
gpsLon              → position.longitude
gpsSpeed            → position.speed
gpsHeading          → position.bearing
gpsAltitude         → position.altitude
```

## 🔧 Troubleshooting

### Problem: "NTS API returned 401"

**Rješenje:** Auth credentials su istekli. Ponovo se uloguj na NTS dashboard i ekstraktuj nove cookies.

### Problem: "Truck not found for NTS device ID"

**Rješenje:** Nisi mapirao NTS Device ID na truck. Vidi Korak 4.

### Problem: "No data in positions table"

**Rješenje:**
1. Provjeri da li je sync pokrenuo: `pm2 logs gps-sync`
2. Provjeri da li trucks imaju `ntsDeviceId` postavljeno
3. Provjeri da li trucks imaju `primaryDriver` dodijeljenog

## 📈 Monitoring

### Check Sync Status

```bash
curl http://localhost:3000/api/sync-gps/status
```

### Check Recent Positions

```bash
curl http://localhost:3000/api/debug/positions | jq
```

### View Live Map

```
http://localhost:3000/live-map
```

Trebao bi vidjeti vozila na mapi sa njihovim real-time pozicijama!

## 🎉 Gotovo!

Sada imaš:
- ✅ Automatsko sinhronizovanje GPS pozicija svake 2 minute
- ✅ Historija pozicija u bazi
- ✅ Live mapa sa vozilima
- ✅ Route replay funkcionalnost
- ✅ Smart ETA kalkulacije

## 💡 Dodatne Opcije

### Sinhronizovanje sa Cron Job (alternativa PM2)

```bash
# Dodaj u crontab
*/2 * * * * cd /path/to/transport && npm run gps-sync >> /var/log/gps-sync.log 2>&1
```

### Webhook Notifikacije (Opciono)

Možeš dodati webhook da te obavijesti kada:
- Vozilo izađe iz zone
- Motor se ugasi/upali
- Nisko gorivo
- itd.

Vidi `lib/geofence.ts` za primjer.
