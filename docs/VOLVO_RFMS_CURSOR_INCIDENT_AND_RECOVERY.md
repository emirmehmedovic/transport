# Volvo rFMS Cursor Incident And Recovery

## Sažetak

Desio se problem gdje je:

- `Volvo Connect` preview na `/volvo-rfms` pokazivao svježe pozicije
- live mapa nije osvježavala Volvo vozače
- route replay nije imao zadnjih nekoliko sati tačaka
- `Zadnji cursor` na Volvo stranici ostajao je zaleđen

Uzrok nije bio u credentialima niti u tome da Volvo API ne radi, nego u načinu kako je istorijski ingest koristio Volvo `vehiclepositions` endpoint.

## Simptomi

Tipični simptomi:

- `/volvo-rfms` prikazuje svježe `Latest pozicija`
- regularni cron log pokazuje npr:
  - `api=116, saved=0, drivers=0`
- replay nema novih tačaka poslije određenog vremena
- live mapa ne vidi zadnju Volvo lokaciju
- UI prikazuje stari cursor, npr:
  - `Zadnji cursor: 2026-06-01 14:53`

## Stvarni uzrok

Prvobitna implementacija koristila je Volvo history sync preko:

- `datetype=received`

i cursor se pomjerao preko `ReceivedDateTime`.

Za naš Volvo account to se pokazalo nepouzdanim:

- endpoint je vraćao isti stari prozor događaja
- čak i kad se `starttime` pomjeri na zadnji `ReceivedDateTime`
- zato je sync tehnički radio, ali nije napredovao

Posljedica:

- `apiPositionsFetched > 0`
- ali `positionsSaved = 0`
- i `driversUpdated = 0`

## Kako je potvrđen uzrok

Ručno je testirano:

1. `latestOnly=true`
- vraćao je svježe Volvo pozicije
- to je dokazalo da API i credentiali rade

2. incremental history sa `datetype=received`
- vraćao je isti batch oko starog cursor vremena

3. isti incremental history sa `datetype=created`
- odmah je vraćao nove događaje koji uredno vremenski rastu

Zaključak:

- problem je bio u `received` paginaciji za ovaj account
- workaround nije potreban
- pravi fix je prebacivanje istorijskog cursora na `created`

## Urađeni fix

Promjena:

- Volvo historical ingest sada koristi:
  - `datetype=created`
- cursor se pomjera po:
  - `CreatedDateTime` / `PositionDateTime`
- u config je dodan:
  - `lastCreatedAt`

Regularni sync sada:

- ne zavisi više od problematičnog `received` cursora
- treba normalno da napreduje kroz nove Volvo događaje

## Dodatni zaštitni mehanizmi

Pored glavnog fixa, dodano je i sljedeće:

### 1. `Popuni zadnja 24h`

Na `/volvo-rfms` postoji dugme:

- `Popuni zadnja 24h`

Namjena:

- recovery nakon mrežnog prekida
- recovery nakon kratkog downtime-a VM-a
- recovery ako regularni sync privremeno preskoči dio dana

Važno:

- ovaj recovery ne dira regularni cursor
- služi samo da dopuni `Position` tabelu i `lastKnown` stanje

### 2. Live map fix

`/api/drivers` sada vraća:

- `lastKnownLatitude`
- `lastKnownLongitude`
- `lastLocationUpdate`

To je bitno da live-map sidebar/status ne pokazuje pogrešno `offline` stanje kad Volvo ima svježu lokaciju.

### 3. Volvo stale alert

Dodan je poseban watchdog:

- provjera svakih `10` minuta
- ako Volvo vozač nema novu lokaciju duže od `30` minuta
- šalje alert na:
  - `emir.m@live.com`

Alert koristi isti SMTP/mail setup kao ostali izvještaji.

Da ne spamuje:

- šalje samo kad se stale skup pojavi ili promijeni
- ne ponavlja isti alert bez promjene stanja

## Operativni postupak ako se problem ikad ponovi

Ako Volvo opet “stane”, idi ovim redom:

### Korak 1: Provjeri preview

Otvori:

- `/volvo-rfms`

Ako `Latest pozicija` pokazuje svježe vrijeme:

- Volvo API radi
- problem je lokalni ingest ili cursor

Ako ni tu nema svježih podataka:

- provjeri Volvo account / API / mrežu

### Korak 2: Pogledaj zadnji sync rezultat

Na istoj stranici pogledaj:

- `API pozicije`
- `Upisano pozicija`
- `Ažurirani vozači`

Tumačenje:

- `API > 0`, `saved = 0`
  - ingest ne pretvara batch u nove upise
- `saved > 0`
  - tačke ulaze u bazu, problem je dalje u prikazu ili filterima

### Korak 3: Pokreni recovery

Klikni:

- `Popuni zadnja 24h`

To treba da:

- dopuni replay
- dopuni `Position`
- dopuni `lastKnown` za live mapu

### Korak 4: Provjeri cron log

Traži Volvo log redove tipa:

- `Volvo rFMS sync done: api=..., saved=..., drivers=...`

Ako vidiš:

- `api > 0`
- `saved > 0`

onda je sync ponovo zdrav.

### Korak 5: Ako ni recovery ne pomaže

Ručno provjeri Volvo API:

`latestOnly`

```bash
curl -u "$VOLVO_RFMS_USERNAME:$VOLVO_RFMS_PASSWORD" \
  -H 'Accept: application/vnd.fmsstandard.com.vehiclepositions.v2.1+json' \
  'https://api.volvotrucks.com/rfms/vehiclepositions?latestOnly=true&datetype=received'
```

`created` history

```bash
curl -u "$VOLVO_RFMS_USERNAME:$VOLVO_RFMS_PASSWORD" \
  -H 'Accept: application/vnd.fmsstandard.com.vehiclepositions.v2.1+json' \
  'https://api.volvotrucks.com/rfms/vehiclepositions?starttime=2026-06-01T12:53:00.000Z&datetype=created'
```

Ako `created` vraća nove događaje:

- Volvo API radi
- lokalni problem je u ingest logici ili persistu

## Šta sada nije garantovano

Ni nakon ovog fixa nema `100%` garancije da se incident nikad više neće desiti, jer i dalje postoje stvari van naše kontrole:

- Volvo API timeout
- `503` sa Volvo strane
- mrežni prekid
- downtime VM-a
- bug ili promjena ponašanja Volvo API-ja

Ali sada imamo:

- ispravan `created` cursor model
- recovery dugme za zadnja 24h
- stale mail alert
- tačniji live-map status

To znači da problem više ne bi trebao ostati neprimijećen ili nerješiv satima.

## Preporuka za budućnost

Ako se pokaže potreba za dodatnom zaštitom, sljedeći korak može biti:

- poseban noćni `Volvo 24h reconciliation` job

Naprimjer:

- svaki dan u `03:30`
- automatski odradi isti recovery za zadnja 24h

To bi bio dodatni safety net i nakon kratkih mrežnih ili server incidenata.
