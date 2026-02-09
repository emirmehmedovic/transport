## TransportApp - Plan Implementacije (OSRM + Schengen 90/180 + EU toll/permit)

### Sažetak ciljeva
- Uvesti OSRM self-host routing/ETA bez plaćenih API-ja.
- Uvesti multi-stop loadove (više pickup/delivery tačaka).
- Automatizirati status loada preko geofence (pickup/delivery entry/exit).
- Izračun Schengen 90/180 dana za vozače.
- Dodati EU toll/permit tracking po kamionu (ručni unos + validnost + alerti).
- Uvesti operativne module: DVIR, incident/claims, trailers, customers + invoicing/AR/AP.

### Pretpostavke i zavisnosti
- OSRM servis je dostupan na internom URL-u (npr. `OSRM_BASE_URL`).
- GPS pozicije se prikupljaju u `Position` tabeli (Traccar).
- Schengen granice su dostupne kao lokalni geojson/shapefile (open data).
- Toll/permit tracking je ručni unos, bez eksternih feedova.

### Faza 0: Priprema (infra + config)
1. Dodati `.env` varijable:
   - `OSRM_BASE_URL`
   - `SCHENGEN_GEOJSON_PATH`
2. Dokumentovati OSRM setup na VPS-u (bootstrap + EU map import).
3. Dodati osnovne util funkcije za routing i geo-compute.

### Faza 1: OSRM routing + Multi-stop loadovi + Schengen 90/180
1. Data model
   - [x] Uvesti `LoadStop` model (sekvenca, tip STOP, lat/lng, adresa, scheduled/actual).
   - [x] Povezati `Load` -> `LoadStop[]`.
2. API
   - [x] `POST /api/routing/osrm` za računanje rute između više stopova.
   - [x] `GET/POST/PUT/DELETE /api/loads/:id/stops`.
   - [x] `GET /api/drivers/:id/schengen` (90/180 summary).
3. UI
   - [x] Update `Create Load` wizard da podržava više stopova.
   - [x] Update `RouteMap` za multi-stop polylines i waypoint markere.
   - [x] Dodati “Schengen 90/180” widget na driver detalje.
4. Background job
   - [x] Dnevna agregacija vozačevih dana u Schengenu (batch iz `Position`) + admin trigger endpoint.

### Napomene (blokade)
- Schengen geojson dataset nije uključen. Potrebno je dodati validan `schengen.geojson` (granice Schengena) kako bi kalkulacija davala tačne rezultate.

### Faza 2: EU toll/permit tracking
1. Data model
   - [x] `TollPermit` (država, tip, validFrom/validTo, truckId, broj, status).
   - [x] `TollPermitType` enum (vignette, tollbox, permit, etc).
   - [x] `TollPermitStatus` enum (active/expired/suspended).
2. API
   - [x] CRUD `/api/toll-permits` (+ filters po truckId/status/type/country).
   - [ ] Alert endpoint za “istek za X dana”.
3. UI
   - [x] Truck detalji: sekcija “Toll/Permit status”.
   - [ ] Dashboard alerti za istek.

### Faza 3: Operativa (DVIR, incidents/claims, trailers, customers/invoicing)
1. DVIR
   - [x] Model `Inspection` (pre/post trip), checklist + notes.
   - [x] API: `/api/inspections` CRUD.
   - [x] Minimalni admin UI `/inspections`.
   - [x] Driver UI + upload fotografija (docs).
2. Incident/Claims
   - [x] Model `Incident` + `Claim`.
   - [x] API: `/api/incidents`, `/api/claims` CRUD.
   - [x] Minimalni admin UI `/incidents`.
   - [x] Incident detail + attachments + claim unos.
3. Trailers
   - [x] Model `Trailer` + assignment na `Truck`.
   - [x] API: `/api/trailers` CRUD.
   - [x] Minimalni admin UI `/trailers`.
4. Customers/Invoices
   - [x] Model `Customer`, `Invoice`, `InvoiceLine`.
   - [x] API: `/api/customers`, `/api/invoices` CRUD.
   - [x] UI za fakturisanje (minimal).
   - [x] AR/AP izvještaji (izvještaji po statusu i due-date).

### Pravila validacije i UX
- Bez routinga ako OSRM nije dostupan: prikaz “manual distance/ETA”.
- Schengen računanje: svaki dan sa barem jednom GPS tačkom unutar Schengena se broji kao “1 dan”.
- Multi-stop: maksimalno 12 stopova po loadu (config).
- Sve promjene logovati u `AuditLog`.

### Milestones
1. M1: OSRM routing + multi-stop loadovi + Schengen calculator.
2. M2: EU toll/permit tracking + alerts.
3. M3: DVIR + incidents/claims + trailers + customers/invoicing.

### Test checklist
- Kreiranje loada sa 3+ stopa.
- OSRM fallback ako servis ne odgovara.
- Schengen 90/180 tačnost na simuliranim pozicijama.
- Istek toll/permit alerti.
- Istek dokumenata (driver/load) alerti.
- DVIR upload (driver) + download dokumenata.
- Incident claim + attachment upload.
- Faktura sa loadovima + AR/AP izvještaj.
