# RIO Nightly Import Plan

## Cilj

Za `MAN / RIO` vozila ne koristimo RIO za live mapu.

Live mapa ostaje na:
- `Traccar`

RIO koristimo kao:
- noćni `audit` izvor
- izvor za naknadno popunjavanje rupa u Traccar praćenju
- pomoć za tačniji `route replay`
- pomoć za tačniji `Schengen` obračun

Osnovna ideja:
- poslije `00:00` skripta koristi authenticated RIO browser session
- povlači dnevne `historic-events` podatke za prethodni dan
- parsira vožnje / događaje / pozicije
- poredi sa našim Traccar pozicijama
- gdje Traccar ima rupe, dopunjava ih RIO podacima po originalnom `timestamp`-u
- zatim naš postojeći replay i Schengen tok koriste objedinjene podatke

---

## Šta ne radimo

Ne koristimo RIO za:
- live tracking u realnom vremenu
- osvježavanje live mape tokom dana
- agresivno pollanje portala ili scraping više puta dnevno

To je važno da:
- ne opteretimo RIO portal
- ne izazovemo blokadu / rate limit / sumnjivo ponašanje
- ne uvodimo krhku pseudo-live integraciju preko browser automatizacije

---

## Predloženi tok

### 1. Vrijeme pokretanja

Skripta se pokreće:
- jednom dnevno
- poslije `00:00`
- preporuka: između `00:20` i `01:00`

Razlog:
- prethodni dan je završen
- izvještaj je stabilan
- manji rizik da RIO još ažurira podatke za isti dan

### 2. Šta skripta radi

Za prethodni dan:

1. otvori RIO portal i napravi authenticated session
2. povuče dnevne `historic-events` podatke
3. opcionalno sačuva raw JSON payload
4. mapira vozilo na naš `Truck` i `Driver`
5. normalizuje događaje / pozicije
6. uporedi ih sa postojećim Traccar pozicijama
7. doda samo ono što nedostaje
8. zapiše audit log / summary

### 3. Način preuzimanja

Preporuka:
- `Playwright`
- authenticated browser session
- interni RIO history endpointi

Ne preporučuje se:
- custom Chrome extension kao prva verzija
- agresivni headless login svakih par minuta
- oslanjanje na krhki UI export klik kao jedini tok

Razlog:
- Playwright je jednostavniji za održavanje
- može raditi server-side
- lakše je kontrolisati raspored i history fetch tok

### 4. Konkretni endpointi

Kroz browser session portal već zove:
- `GET https://api.asset-history.rio.cloud/historic-events/assets/{assetId}`
- `GET https://api.asset-history.rio.cloud/historic-positions/assets/{assetId}`

Za nightly import je praktičniji `historic-events`, jer sa:
- `include_only_event_types=position,...`

vraća gusti `position` stream sa:
- `occurred_at`
- `metadata.position.latitude`
- `metadata.position.longitude`
- `metadata.address`
- `metadata.driver_name`
- `metadata.mileage_in_km`
- `metadata.speed_in_km_per_hour`
- `metadata.fuel_level_in_percentage`

---

## Arhitektura

### Komponente

Predloženi dijelovi:

- `lib/rio-portal.ts`
- `lib/rio-history.ts`
- `lib/rio-import.ts`
- `lib/rio-reconciliation.ts`
- `scripts/rio-download-history.ts`
- `scripts/rio-import-history.ts`
- `scripts/rio-nightly-runner.ts`

Opcionalno:
- `docs/RIO_NIGHTLY_IMPORT_PLAN.md`
- admin page za pregled import history

### Odgovornosti

`rio-portal.ts`
- login na RIO
- otvaranje asset-history page-a
- hvatanje bearer tokena iz browser sessiona

`rio-history.ts`
- ekstrakcija gustih `position` tačaka iz `historic-events`
- proračun lokalnog dnevnog UTC raspona

`rio-import.ts`
- upis history / CSV tačaka u interni format i `Position`

`rio-reconciliation.ts`
- poređenje sa Traccar pozicijama
- odluka šta dodati, šta preskočiti

`rio-nightly-runner.ts`
- orkestracija cijelog procesa
- logovanje
- summary i greške

---

## Data model pristup

Ne treba uvoditi poseban replay sistem za RIO.

Najjednostavniji i najbolji pristup:
- koristiti postojeću `Position` tabelu

RIO import upisuje:
- `driverId`
- `deviceId = rio:<vin>`
- `latitude`
- `longitude`
- `speed`
- `bearing` ako postoji
- `altitude` ako postoji
- `recordedAt` = originalni timestamp iz RIO izvještaja
- `receivedAt` = vrijeme importa

To daje:
- replay može koristiti iste postojeće API-je i UI
- Schengen logika vidi iste `Position` zapise
- nema duplog sistema

Važno:
- **nikad ne koristiti vrijeme importa kao recordedAt**
- `recordedAt` mora biti originalni timestamp iz RIO izvještaja

---

## Pravila za dopunu rupa

Najvažniji dio implementacije je da ne pravimo duplikate i ne kontaminiramo postojeći tracking.

### Osnovno pravilo

RIO ne treba da pregazi Traccar.

RIO treba da:
- dopuni rupe
- eventualno doda dodatne tačke između rijetkih Traccar tačaka
- ali ne da nekritički duplira sve

### Preporučena logika

Za svaki RIO zapis:

1. nađi vozača po dodijeljenom kamionu / VIN-u
2. uzmi postojeće Traccar pozicije tog vozača za isti dan
3. provjeri postoji li već tačka u blizini:
   - vremenski prag, npr. `±5 min`
   - prostorni prag, npr. `<= 300 m`

Ako postoji bliska Traccar tačka:
- ne dodavati RIO zapis

Ako ne postoji:
- dodati RIO zapis

### Dodatno pravilo za velike rupe

Ako postoji Traccar rupa veća od npr.:
- `20 min`

i RIO ima validne tačke unutar te rupe:
- dodati RIO tačke

To je glavni mehanizam “popunjavanja rupa”.

### Dodatno pravilo za početak/kraj dana

Ako Traccar nema:
- početak vožnje
- kraj vožnje

a RIO ima:
- dozvoljeno je dodati i te rubne tačke

---

## Izvor podataka i označavanje

Svaki zapis mora ostati jasno označen po izvoru.

Predlog:
- `deviceId = rio:<vin>` za RIO
- `deviceId = <traccarDeviceId>` za Traccar

Time uvijek možemo:
- razlikovati izvor
- filtrirati ili debugovati
- objasniti korisniku odakle je došla tačka

Poželjno je i u audit log zapisati:
- datum importa
- za koliko vozila je import rađen
- koliko RIO tačaka je dodano
- koliko je preskočeno kao duplikat
- koliko je rupa dopunjeno

---

## Kako će to uticati na replay

Route replay može ostati na postojećoj logici.

Pošto replay već čita `Position` zapise:
- nove RIO tačke će se automatski pojaviti u replay-u
- snap-to-road i stop detekcija će imati više materijala
- route replay će biti potpuniji kad Traccar zaspi

Važno:
- replay ne treba razlikovati RIO i Traccar u osnovnom prikazu
- ali debug / detaljni prikaz može kasnije pokazati source ako bude trebalo

---

## Kako će to uticati na Schengen

Schengen obračun će imati direktnu korist:

- ako je Traccar prespavao dio dana
- a RIO ima timestamp-irane pozicije
- Schengen logika će naknadno vidjeti te pozicije
- i ispravno izračunati:
  - dane u Schengenu
  - ulaske / izlaske iz BiH

To znači:
- RIO nightly import je odličan fallback za Schengen
- posebno za MAN flotu

---

## Neagresivan pristup prema RIO portalu

Ovo je kritično.

Da ne bismo bili agresivni:

1. pokretati skriptu samo `1x dnevno`
2. skidati samo izvještaj za prethodni dan
3. koristiti jedan browser session
4. ne raditi paralelne browser instance
5. između klikova i koraka koristiti normalne pauze
6. ne raditi refresh petlje
7. čuvati već preuzeti fajl i ne skidati ga ponovo ako je isti dan već obrađen

### Sigurne preporuke

- start između `00:20` i `01:00`
- timeout čekanja download-a `60-120s`
- random mali delay između UI koraka `1-3s`
- jedan import job u isto vrijeme

---

## Idempotentnost

Nightly import mora biti siguran za ponovno pokretanje.

To znači:
- ako se isti dan importuje 2 puta
- ne smijemo duplirati iste RIO tačke

Kako to postići:
- prije `position.create` provjeriti postoji li već zapis sa:
  - istim `driverId`
  - istim `deviceId`
  - istim `recordedAt`
- ako postoji, preskočiti

To je minimalni zaštitni mehanizam.

Poželjno dodatno:
- i prostorno/vremensko duplikat pravilo

---

## Faze implementacije

### Faza 1: Proof of concept

Napraviti:
- Playwright login
- download jednog dnevnog izvještaja
- lokalni parser

Cilj:
- potvrditi da se portal može stabilno automatizovati

### Faza 2: Normalizacija

Napraviti:
- parser u interni format
- mapiranje `VIN -> Truck -> Driver`

### Faza 3: Reconciliation

Napraviti:
- poređenje sa Traccar pozicijama
- pravila za duplikate i popunjavanje rupa

### Faza 4: Import

Napraviti:
- upis u `Position`
- audit summary

### Faza 5: Scheduler

Napraviti:
- nightly cron / PM2 job
- zaključavanje da ne rade 2 importa istovremeno

---

## Predlog operativnog rasporeda

Primjer:

- `00:30` RIO nightly import za prethodni dan
- `00:35-00:50` parsing i reconciliation
- `00:50` audit summary log

Ako import padne:
- retry jednom npr. u `02:00`

Ne više od toga u automatskoj verziji.

---

## Rizici

### 1. Portal promijeni UI

Rizik:
- Playwright skripta pukne

Mitigacija:
- koristiti stabilne selektore
- držati skriptu jednostavnom
- imati screenshot logging kod greške

### 2. Session istekne

Rizik:
- treba ponovni login

Mitigacija:
- persistent session
- fallback login flow

### 3. Format Excel-a se promijeni

Rizik:
- parser pukne

Mitigacija:
- validacija kolona
- defensive parsing
- logovanje nepoznatih layout-a

### 4. Dupliranje tačaka

Rizik:
- zagađenje replay-a

Mitigacija:
- idempotent import
- temporal/spatial dedupe

---

## Preporuka

Ovo je dobar pristup ako želimo:
- zadržati `Traccar` za live mapu
- koristiti `RIO` kao noćni fallback i audit izvor

To je racionalna arhitektura za MAN:
- tokom dana `Traccar`
- poslije ponoći `RIO` dopuna

Za Volvo:
- i dalje je bolji direktni OEM API

Za MAN:
- nightly RIO import je vrlo dobar kompromis

---

## Nalaz iz stvarnog RIO sample izvještaja

Pregledan je sample fajl:

- `Povijest vožnje_objekt_MILOŠ ĆAPARA- E17-A-800_Razdoblje upita_2026-04-10-00h00m_do_2026-05-10-23h59m.xls`

Ključni nalazi:

- ukupno zapisa: `536`
- zapisa sa koordinatama: `515`
- zapisa bez koordinata: `21`
- događaji:
  - `258` × `Pokrenut`
  - `258` × `Zaustavljen`
  - `16` × `Granični prijelaz`
- prosjek po aktivnom danu: oko `26,8` redova
- maksimum u jednom danu: `69` redova
- median vremenski razmak između zapisa: oko `5 min`

Zaključak iz sample-a:

- izvještaj je **dovoljno gust za noćni audit**
- dovoljno je gust za **Schengen obračun i detekciju prelaza**
- dovoljno je dobar za **dopunjavanje rupa u Traccar-u**
- dovoljno je upotrebljiv za **fallback replay**

Važna napomena:

- ovaj format nije idealna zamjena za pravi gust live GPS stream
- ali je vrlo dobar kao:
  - nightly fallback
  - audit izvor
  - izvor za popravku Traccar rupa

To potvrđuje da je plan:
- `Traccar za live`
- `RIO nightly import za audit + gap filling`

tehnički opravdan.

---

## Sljedeći korak

Prvi praktični korak:

1. proof-of-concept `Playwright` skripta
2. fetch jednog dnevnog `historic-events` payload-a
3. parser i pregled izlaza

Tek poslije toga:
- reconciliation
- import u `Position`
- nightly scheduler

---

## Nalaz iz stvarnog RIO portala

Za asset:
- `88ec0899-39e9-4979-a6e7-f9abdd097725`

potvrđeno je da `historic-events` sa `position` eventima vraća gust dnevni trag.

Test za lokalni dan:
- `2026-05-22`

vratio je:
- `805` history događaja za jedan dan

To potvrđuje da portal session + `historic-events` endpoint daje dovoljno gust trag za:
- nightly import
- gap filling
- fallback replay
- Schengen obračun
