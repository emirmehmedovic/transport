# GPS Timestamp Problem - Debugging Guide

## 🔴 Problem

Pozicije koje dolaze sa GPS uređaja imaju loše timestamp-ove (1970-01-01) i ne prikazuju se u "Prikaži više" panelu na live map-i.

Sidebar prikazuje samo pozicije iz zadnjih 7 dana, ali pozicije sa 1970-01-01 datumom su izvan tog range-a.

## 📊 Status

### Trenutno stanje (provjera):
```bash
npm run check:positions
```

**Rezultati:**
- Mike Driver: 101 pozicija (3 bad, 98 good)
- Salko Cerkezovic: 0 pozicija (očišćeno)

### Problem uzrok:

GPS uređaj ili šalje:
1. `timestamp=0` ili `timestamp` nije uključen u payload
2. `timestamp` u formatu koji ne prepoznajemo
3. `timestamp` u sekundama umjesto milisekundi (ali naš kod to pokriva)

## 🔧 Rješenje - Fazno

### Faza 1: Dodano Detaljno Logovanje ✅

Modifikovan `/app/api/telemetry/route.ts` sa kompletnim logovanjem:

- Loguje raw request (GET params ili POST body)
- Loguje extracted timestamp vrijednost
- Loguje timestamp parsing proces (seconds vs milliseconds)
- Loguje validation (min: 2020-01-01, max: now + 1 day)
- Loguje finalni `recordedAt` koji se čuva u bazu

**Primer output-a:**
```
[Telemetry] ═══════════════════════════════════════════════════════
[Telemetry] Request received: 2026-02-01T16:30:00.000Z
[Telemetry] Method: GET
[Telemetry] URL: https://your-app.com/api/telemetry?id=kamion0001&lat=43.86&lon=18.43&timestamp=1738429800
[Telemetry] ─────────────────────────────────────────────────────
[Telemetry] Timestamp parsing:
[Telemetry]   Raw timestamp: 1738429800
[Telemetry]   Type: string
[Telemetry]   As number: 1738429800
[Telemetry]   Is NaN: false
[Telemetry]   Format detected: seconds
[Telemetry]   Parsed date: 2026-02-01T16:30:00.000Z
[Telemetry]   ✅ Using parsed timestamp: 2026-02-01T16:30:00.000Z
[Telemetry] ─────────────────────────────────────────────────────
[Telemetry] Saving position:
[Telemetry]   Device: kamion0001
[Telemetry]   Location: (43.86, 18.43)
[Telemetry]   recordedAt: 2026-02-01T16:30:00.000Z
[Telemetry]   receivedAt: 2026-02-01T16:30:01.123Z
[Telemetry] ✅ Position saved
[Telemetry] ═══════════════════════════════════════════════════════
```

### Faza 2: Provjeri Trenutne Logove

**Opcija A: Prati logove u real-time**
```bash
npm run watch:gps
```

Ovo će prikazati samo `[Telemetry]` linije iz dev server logova.

**Opcija B: Pregledaj kompletne logove**
```bash
tail -f /tmp/next-dev.log
```

**Opcija C: Filtriraj timestamp processing**
```bash
tail -f /tmp/next-dev.log | grep "Timestamp parsing" -A 10
```

### Faza 3: Sačekaj Sledeći GPS Update

GPS šalje podatke:
- **Kada se kreće:** Svako 300 sekundi (5 minuta)
- **U stanju mirovanja:** Svako 1800 sekundi (30 minuta)

**Kada stigne sledeći update, logovi će pokazati:**
1. Koju vrednost ima `timestamp` parametar (ili da li uopšte postoji)
2. Kako se parsira
3. Da li prolazi validaciju
4. Šta se tačno čuva u bazu

### Faza 4: Čišćenje Loših Pozicija

**Ručno clean-up** (interaktivno):
```bash
node scripts/cleanup-bad-positions.js
```

Ovo će:
1. Pronaći sve pozicije sa `recordedAt < 2020-01-01`
2. Grupisati ih po vozačima
3. Pitati za potvrdu
4. Obrisati ih ako kažeš "y"

**Automatski clean-up** (bez potvrde):
```javascript
await prisma.position.deleteMany({
  where: {
    recordedAt: {
      lt: new Date('2020-01-01'),
    },
  },
});
```

## 🧪 Testiranje

### 1. Provjeri trenutno stanje
```bash
npm run check:positions
```

### 2. Pokreni monitoring (u novom terminalu)
```bash
npm run watch:gps
```

### 3. Čekaj GPS update (5-30 min)

Kada stigne GPS update, provjerite logove i potražite:

**Problem Scenario 1: Timestamp nije poslat**
```
[Telemetry]   Raw timestamp: undefined
[Telemetry]   ⚠️  No timestamp provided - using current time
```

**Rješenje:** Konfigurisi GPS app da uključi timestamp u payload.

**Problem Scenario 2: Timestamp u lošem formatu**
```
[Telemetry]   Raw timestamp: "2026-02-01 16:30:00"
[Telemetry]   Type: string
[Telemetry]   As number: NaN
[Telemetry]   Trying ISO parse: Invalid Date
```

**Rješenje:** Dodaj novi parser za taj format u `telemetry/route.ts`.

**Problem Scenario 3: Timestamp van range-a**
```
[Telemetry]   Raw timestamp: 0
[Telemetry]   Parsed date: 1970-01-01T00:00:00.000Z
[Telemetry]   ❌ Invalid timestamp 0 - using current time
```

**Rješenje:** GPS šalje `0` kad nema signal. Naš kod koristi `new Date()` kao fallback - to je OK!

### 4. Provjeri da li je pozicija sačuvana
```bash
npm run check:positions
```

### 5. Testiraj Sidebar

1. Otvori http://localhost:3000/live-map
2. Klikni na vozača
3. Klikni "Prikaži više"
4. Pozicije trebaju biti vidljive (ako su < 7 dana)

## 📝 Scripts Referenca

| Script | Opis |
|--------|------|
| `npm run check:positions` | Provjeri sve vozače i njihove pozicije |
| `npm run check:salko` | Provjeri samo Salko-ve pozicije |
| `npm run watch:gps` | Prati GPS telemetry logove u real-time |
| `npm run monitor:salko` | Čekaj Salko-v sledeći GPS update |
| `node scripts/cleanup-bad-positions.js` | Očisti pozicije sa lošim timestamp-ovima |

## 🔍 Koje Podatke GPS Treba Da Šalje

### OsmAnd Format (Background Geolocation)

**GET request:**
```
https://your-app.com/api/telemetry?id=kamion0001&lat=43.86&lon=18.43&timestamp=1738429800&speed=50&bearing=180
```

**POST request:**
```json
{
  "location": {
    "coords": {
      "latitude": 43.86,
      "longitude": 18.43,
      "speed": 50,
      "heading": 180,
      "timestamp": 1738429800000
    }
  },
  "device_id": "kamion0001"
}
```

### Timestamp Formati Koje Podržavamo

| Format | Primer | Opis |
|--------|--------|------|
| Unix (sekunde) | `1738429800` | 10 cifara, konvertuje se u ms |
| Unix (milisekunde) | `1738429800000` | 13 cifara, direktno |
| ISO 8601 | `"2026-02-01T16:30:00Z"` | String format |

## 🎯 Očekivani Rezultat

Nakon što vidimo logove i identifikujemo problem:

1. **Ako timestamp nedostaje** → Konfigurišemo GPS app
2. **Ako je format loš** → Dodamo parser za taj format
3. **Ako su svi podaci OK** → Problem je već riješen sa validation kodom

Zatim:
1. Očistimo stare loše pozicije
2. Sačekamo fresh GPS data
3. Pozicije će se prikazivati u "Prikaži više" panelu ✅

## 🆘 Kontakt za Debug

Ako vidiš nešto neobično u logovima, kopiraj output i pokažemo da vidimo šta GPS šalje.
