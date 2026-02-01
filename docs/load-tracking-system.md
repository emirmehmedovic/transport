# Load Tracking System - Automatsko i Manualno Praćenje

## Pregled Sistema

Sistem za praćenje loadova kombinuje **automatsko GPS praćenje** i **manualne kontrole** da bi tačno pratio status transporta u realnom vremenu.

## 🤖 Automatsko Praćenje (GPS-Based)

### Kako Radi

1. **GPS Telemetrija Stiže**: Kada GPS uređaj šalje poziciju na `/api/telemetry`
2. **Provjera Proximity**: Sistem automatski provjerava:
   - Da li je vozač blizu pickup lokacije (radius: 500m)
   - Da li je vozač blizu delivery lokacije (radius: 500m)
3. **Auto-Update Statusa**: Kada vozač uđe u zonu:
   - **ASSIGNED → PICKED_UP**: Kada uđe u pickup zonu
   - **IN_TRANSIT → DELIVERED**: Kada uđe u delivery zonu

### Implementacija

#### Telemetry API (`/api/telemetry/route.ts`)
```typescript
// Nakon što se sačuva pozicija...
checkLoadProximity(driver.id, latitude, longitude).catch(error => {
  console.error('[Telemetry] Load proximity check failed:', error);
});
```

#### Load Proximity Check (`lib/geofence.ts`)
```typescript
export async function checkLoadProximity(
  driverId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 500
): Promise<void>
```

**Što radi:**
- Pronalazi sve aktivne loadove vozača (ASSIGNED, PICKED_UP, IN_TRANSIT)
- Računa udaljenost do pickup/delivery lokacija
- Automatski ažurira status ako je vozač unutar radijusa

### Logging
```
[LoadProximity] 🚛 Auto-updated LOAD-123: ASSIGNED → PICKED_UP (347m from pickup)
[LoadProximity] 📦 Auto-updated LOAD-123: IN_TRANSIT → DELIVERED (289m from delivery)
```

---

## 👤 Manualno Praćenje (Driver Controls)

### UI Kontrole

Vozač vidi akcione dugmad na driver details stranici (`/drivers/{id}`):

| Status Loada | Dostupna Akcija | Dugme |
|--------------|----------------|-------|
| **ASSIGNED** | Preuzimanje tereta | 🔵 "Preuzeo sam teret" |
| **PICKED_UP** | Početak vožnje | 🟢 "Započinjem vožnju" |
| **IN_TRANSIT** ili **PICKED_UP** | Isporuka | 📍 "Isporučeno" |

### API Endpoint

**POST** `/api/loads/{id}/update-status`

**Body:**
```json
{
  "action": "pickup" | "start_transit" | "deliver"
}
```

**Validacija:**
- Vozač može samo ažurirati svoje loadove
- Admin/Dispatcher mogu ažurirati bilo koji load
- Provjerava ispravne state transitions

**State Transitions:**
```
pickup:        ASSIGNED      → PICKED_UP
start_transit: PICKED_UP     → IN_TRANSIT
deliver:       IN_TRANSIT    → DELIVERED
               PICKED_UP     → DELIVERED (direktno)
```

### Primjer Poziva (Frontend)
```typescript
const handleUpdateLoadStatus = async (
  loadId: string,
  action: 'pickup' | 'start_transit' | 'deliver'
) => {
  const res = await fetch(`/api/loads/${loadId}/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action }),
  });

  const data = await res.json();
  if (res.ok) {
    alert(data.message); // "Load status updated to PICKED_UP"
  }
};
```

---

## 🗺️ Geofence Zones (Opcionalno)

Pored proximity check-a, sistem podržava i kreiranje geofence zona.

### Automatsko Kreiranje Zona

```typescript
import { createZoneFromLoad } from '@/lib/geofence';

// Kreiranje pickup zone
await createZoneFromLoad(loadId, 'PICKUP');

// Kreiranje delivery zone
await createZoneFromLoad(loadId, 'DELIVERY');
```

**Defaultni parametri:**
- Radius: 500m
- Notifikacije: Entry/Exit eventi

### Kada se koriste zone?

Zones su korisne kada:
- Želiš vidjeti historiju ulazaka/izlazaka u zonu
- Trebaš kompleksnije oblike zona (ne samo kružne)
- Želiš dodatne notifikacije

**Napomena:** `checkLoadProximity` radi bez zona - direktno računa udaljenost.

---

## 📊 Flow Dijagram

### Automatski Flow
```
GPS Telemetry → /api/telemetry
                      ↓
           Save Position to DB
                      ↓
           checkLoadProximity()
                      ↓
        Calculate distance to pickup/delivery
                      ↓
         Within 500m? → YES → Auto-update status
                      ↓
                     NO → Do nothing
```

### Manualni Flow
```
Driver → "Preuzeo sam teret" button
              ↓
       POST /api/loads/{id}/update-status
              ↓
       Validate permissions & state
              ↓
       Update load status to PICKED_UP
              ↓
       Set actualPickupDate = NOW
              ↓
       Return success
```

---

## 🔧 Konfiguracija

### Prilagođavanje Radiusa

Defaultni radius je 500m. Možeš ga promijeniti:

```typescript
// U telemetry API-ju
checkLoadProximity(driver.id, latitude, longitude, 1000); // 1km radius
```

### Onemogući Auto-Update

Ako želiš samo manualne kontrole, jednostavno ukloni:

```typescript
// U /api/telemetry/route.ts
// checkLoadProximity(driver.id, latitude, longitude); // Komentiraj
```

---

## 🧪 Testiranje

### Test Automatskog Praćenja

1. **Assignuj load vozaču** sa validnim pickup/delivery koordinatama
2. **Simuliraj GPS poziciju** blizu pickup lokacije:
   ```bash
   curl -X POST "http://localhost:3000/api/telemetry" \
     -H "Content-Type: application/json" \
     -d '{
       "id": "kamion0001",
       "lat": 43.8563,
       "lon": 18.4131,
       "speed": 0
     }'
   ```
3. **Provjeri logs**:
   ```
   [LoadProximity] 🚛 Auto-updated LOAD-XXX: ASSIGNED → PICKED_UP
   ```

### Test Manuelnih Kontrola

1. **Otvori** `/drivers/{driverId}` stranicu
2. **Pronađi** load sa statusom ASSIGNED
3. **Klikni** "Preuzeo sam teret"
4. **Potvrdi** da je status promijenjen u PICKED_UP

---

## 📝 Database Schema

### Važna Polja

**Load Table:**
```prisma
model Load {
  status               String   // ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED
  actualPickupDate     DateTime?
  actualDeliveryDate   DateTime?
  pickupLatitude       Float?
  pickupLongitude      Float?
  deliveryLatitude     Float?
  deliveryLongitude    Float?
}
```

**Position Table:**
```prisma
model Position {
  driverId    String
  latitude    Float
  longitude   Float
  recordedAt  DateTime
}
```

---

## 🎯 Best Practices

1. **Kombiniraj oba pristupa**: Auto + Manual
   - Auto za većinu slučajeva
   - Manual kao backup ili override

2. **Postavi razumne radijuse**:
   - Warehouses: 500m - 1km
   - Gradska dostava: 200m - 500m

3. **Monitoruj logs**: Provjeri da li auto-update radi kako treba

4. **Obaviješti vozača**: Dodaj notifikacije kada se status auto-ažurira

---

## 🐛 Troubleshooting

### "Auto-update ne radi"

✅ **Provjeri:**
1. Da li load ima GPS koordinate (pickupLatitude/pickupLongitude)?
2. Da li vozač šalje GPS podatke na /telemetry?
3. Da li je vozač dodijeljen tom loadu (driverId = load.driverId)?
4. Da li je status loada validan za transition?

### "Manualne kontrole ne rade"

✅ **Provjeri:**
1. Da li je vozač ulogovan?
2. Da li vozač pokušava ažurirati svoj load?
3. Da li je state transition validan?
4. Check browser console za errors

---

## 📚 API Reference

### Load Status Update API

**Endpoint:** `POST /api/loads/{id}/update-status`

**Auth:** Required (Cookie-based)

**Body:**
| Field | Type | Required | Values |
|-------|------|----------|--------|
| action | string | Yes | `pickup`, `start_transit`, `deliver` |

**Response (Success):**
```json
{
  "success": true,
  "load": { /* Updated load object */ },
  "message": "Load status updated to PICKED_UP"
}
```

**Response (Error):**
```json
{
  "error": "Cannot pickup - load is currently IN_TRANSIT. Expected: ASSIGNED"
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid action or state transition
- `401` - Unauthorized
- `403` - Forbidden (not your load)
- `404` - Load not found
- `500` - Server error

---

## 🚀 Roadmap

### Planned Features

- [ ] Push notifikacije za auto-updates
- [ ] Konfigurabilan radius per load
- [ ] Manual override za auto-detected events
- [ ] SMS notifikacije za pickup/delivery
- [ ] Integration sa Traccar geofences
- [ ] Photo upload za proof of delivery

---

## 💡 Tips

1. **Testing locally**: Koristi `/scripts/test-telemetry.sh` za simuliranje GPS pozicija
2. **Production**: Postavi webhook od Traccar-a da šalje na `/api/telemetry`
3. **Monitoring**: Provjeravaj logs redovno za auto-update eventi

