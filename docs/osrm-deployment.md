# OSRM Deployment Vodič

Ovaj vodič je prilagođen za setup gdje:

- `Next.js` aplikaciju pokrećete preko `PM2`
- `OSRM` radi kao zaseban servis na istom serveru
- aplikacija i OSRM nisu isti proces

Ovaj vodič je za scenario gdje `OSRM` hostate na istom serveru kao i ovu aplikaciju.

Za ovaj projekat to je dobar pristup zato što:

- `OSRM` je open-source i besplatan za korištenje
- ne ovisite o javnom demo servisu
- `OSRM_BASE_URL` je već podržan u kodu
- dugoročno je stabilnije i lakše za održavanje nego oslanjanje na tuđi free endpoint

Napomena:

- `OSRM` softver je besplatan
- server resursi nisu besplatni
- ako ga hostate na svom VPS/serveru, plaćate samo taj server

## 1. Šta ovaj projekat već podržava

Kod već koristi:

- `OSRM_BASE_URL` u [lib/routing/osrm.ts](/Users/emir_mw/transport/lib/routing/osrm.ts:35)

Ako varijabla nije postavljena, fallback je javni:

- `https://router.project-osrm.org`

Za produkciju se preporučuje da postavite vlastiti OSRM.

## 2. Preporučeni način za vaš setup

Pošto koristite `PM2`, preporuka je:

- aplikacija ostaje pod `PM2`
- `OSRM` ide kao zaseban Docker container

To je vrlo dobar balans:

- ne morate prebacivati cijelu aplikaciju u Docker
- OSRM ostaje izolovan kao servis
- održavanje je jednostavno

## 3. Zašto ne PM2 za OSRM

Tehnički, `PM2` je dobar za Node procese, ali `OSRM` nije Node aplikacija nego poseban binarni servis.

Zato je bolja podjela:

- `PM2` za aplikaciju
- Docker za `OSRM`

To je i čistije i praktičnije.

## 4. Preporučeni način: Docker za OSRM

Najpraktičnije je dignuti `OSRM` kroz Docker.

Trebate:

1. Docker na serveru
2. OSM `.pbf` extract za područje koje vas zanima
3. direktorij na serveru gdje će stajati OSRM podaci

## 5. Koji OSM extract uzeti

Nemojte odmah koristiti cijelu planetu osim ako baš morate.

Za vaše trenutne rute preporuka nije cijela Europa nego tačno ove države:

- Bosna i Hercegovina
- Hrvatska
- Srbija
- Slovenija

To pokriva vaše najbitnije pravce:

- unutrašnje BiH rute
- `Luka Ploče`
- pravce kroz Hrvatsku
- pravce kroz Srbiju
- `Koper`, Slovenija

To je mnogo racionalnije nego `europe-latest.osm.pbf`.

Praktično:

- `Bosnia-Herzegovina` extract
- `Croatia` extract
- `Serbia` extract
- `Slovenia` extract

Ove extracte treba spojiti u jedan zajednički `.osm.pbf`, pa nad tim jednim fajlom pokrenuti OSRM preprocessing.

Što je region veći:

- duže traje priprema
- treba više RAM-a i diska
- sporije se održava

## 4. Preporučena OSRM pipeline

Prema zvaničnom OSRM projektu, za većinu slučajeva preporučen je `MLD` pipeline.

To znači:

1. `osrm-extract`
2. `osrm-partition`
3. `osrm-customize`
4. `osrm-routed --algorithm mld`

Izvor:

- OSRM backend quick start: https://github.com/Project-OSRM/osrm-backend

## 6. Preporučeni izvori podataka

Preporučeni Geofabrik extracti:

- `https://download.geofabrik.de/europe/bosnia-herzegovina-latest.osm.pbf`
- `https://download.geofabrik.de/europe/croatia-latest.osm.pbf`
- `https://download.geofabrik.de/europe/serbia-latest.osm.pbf`
- `https://download.geofabrik.de/europe/slovenia-latest.osm.pbf`

Izvori:

- Europe indeks: https://download.geofabrik.de/europe.html
- Bosnia-Herzegovina: https://download.geofabrik.de/europe/bosnia-herzegovina.html
- Croatia: https://download.geofabrik.de/europe/croatia.html
- Serbia: https://download.geofabrik.de/europe/serbia.html
- Slovenia: https://download.geofabrik.de/europe/slovenia.html

## 7. Primjer direktorija na serveru

Na serveru napravite npr.:

```bash
mkdir -p /opt/osrm/data
mkdir -p /opt/osrm/build
cd /opt/osrm
```

U ovom vodiču koristimo:

```text
/opt/osrm/data/         -> pojedinačni country extracti
/opt/osrm/build/        -> merged fajl i OSRM output
```

## 8. Spajanje 4 extracta u jedan region

Najčistiji pristup je:

1. skinuti 4 country extracta
2. spojiti ih u jedan `west-balkan-core.osm.pbf`
3. nad tim fajlom pokrenuti OSRM

Za merge preporučujem `osmium-tool`.

Ako ga nemate:

```bash
sudo apt-get update
sudo apt-get install -y osmium-tool
```

Preuzimanje:

```bash
cd /opt/osrm/data

wget -N https://download.geofabrik.de/europe/bosnia-herzegovina-latest.osm.pbf
wget -N https://download.geofabrik.de/europe/croatia-latest.osm.pbf
wget -N https://download.geofabrik.de/europe/serbia-latest.osm.pbf
wget -N https://download.geofabrik.de/europe/slovenia-latest.osm.pbf
```

Merge:

```bash
cd /opt/osrm

osmium merge \
  /opt/osrm/data/bosnia-herzegovina-latest.osm.pbf \
  /opt/osrm/data/croatia-latest.osm.pbf \
  /opt/osrm/data/serbia-latest.osm.pbf \
  /opt/osrm/data/slovenia-latest.osm.pbf \
  -o /opt/osrm/build/west-balkan-core.osm.pbf
```

Napomena:

- merged output je jedan zajednički region
- to je praktičnije za OSRM nego četiri odvojena routing servisa

## 9. Inicijalna priprema podataka

Primjer za `car` profil:

```bash
cd /opt/osrm

docker run --rm -t \
  -v /opt/osrm/build:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/west-balkan-core.osm.pbf

docker run --rm -t \
  -v /opt/osrm/build:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-partition /data/west-balkan-core.osrm

docker run --rm -t \
  -v /opt/osrm/build:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-customize /data/west-balkan-core.osrm
```

Ako ova tri koraka prođu, podaci su spremni za servis.

## 10. Pokretanje OSRM servisa

Najjednostavniji `docker run` primjer:

```bash
docker run -d --name osrm \
  --restart unless-stopped \
  -p 5000:5000 \
  -v /opt/osrm/build:/data \
  ghcr.io/project-osrm/osrm-backend \
  osrm-routed --algorithm mld /data/west-balkan-core.osrm
```

Test:

```bash
curl "http://127.0.0.1:5000/route/v1/driving/18.4131,43.8563;18.6671,44.5384?overview=false"
```

Ako radi, dobićete JSON odgovor sa `code: "Ok"`.

Preporučene operacije:

```bash
docker ps
docker logs -f osrm
docker restart osrm
docker stop osrm
docker start osrm
```

## 11. Kako povezati OSRM sa aplikacijom pod PM2

U `.env` aplikacije dodajte:

```env
OSRM_BASE_URL=http://127.0.0.1:5000
```

Pošto je aplikacija pod `PM2`, a OSRM na istom serveru, `127.0.0.1:5000` je najjednostavniji i najčistiji izbor.

Nakon izmjene `.env` i nakon što je OSRM pokrenut:

1. restartati aplikaciju
2. testirati replay ili rutu

Primjer:

```bash
pm2 restart transport-app
```

Ako je vaš PM2 proces drugačije nazvan, restartajte taj naziv.

## 12. PM2 podsjetnik za aplikaciju

Ako aplikaciju već držite pod PM2, tipičan flow je:

```bash
npm run build
pm2 restart transport-app
pm2 save
```

Ako tek prvi put dižete app:

```bash
pm2 start npm --name "transport-app" -- start
pm2 save
pm2 startup
```

## 12. Reverse proxy opcionalno

Ne morate nužno izlagati OSRM javno na internetu.

Bolja varijanta je:

- aplikacija pristupa OSRM-u interno
- OSRM port ostaje interni

Ako ipak želite reverse proxy kroz `nginx`, možete ga izložiti npr. kao:

```text
https://osrm.vasa-domena.com
```

Tada u `.env` može ići:

```env
OSRM_BASE_URL=https://osrm.vasa-domena.com
```

Ali za ovaj projekat interni URL je obično bolji i jednostavniji.

## 13. Ažuriranje OSM podataka

OSM podaci zastarijevaju. Najjednostavniji maintenance je povremeni refresh.

Osnovni postupak:

1. skinuti nova 4 country `.osm.pbf` fajla
2. ponovo uraditi merge
2. ponovo pokrenuti:
   - `osrm-extract`
   - `osrm-partition`
   - `osrm-customize`
4. restartati `osrm-routed`

To možete raditi:

- ručno
- sedmično
- mjesečno

Za početak je mjesečno obično sasvim dovoljno.

## 14. Koliko resursa treba

To zavisi od regiona.

Praktično pravilo:

- manji region: sasvim izvodivo na običnom VPS-u
- veći region: treba više RAM-a i diska
- cijela Europa: već traži ozbiljniji server

Za vaš slučaj ovaj skup država je dobar balans:

- dovoljno mali da bude razuman za isti server
- dovoljno velik da pokrije Ploče i Koper

## 15. Šta preporučujem za vas

Za ovaj projekat preporuka je:

1. hostati `OSRM` na istom serveru
2. koristiti Docker
3. koristiti `MLD` pipeline
4. držati `OSRM_BASE_URL` kao interni URL
5. koristiti merged region:
   `Bosnia-Herzegovina + Croatia + Serbia + Slovenia`
6. ne koristiti javni demo OSRM za produkciju

## 16. Kratki checklist

1. instalirati Docker
2. kreirati `/opt/osrm/data`
3. kreirati `/opt/osrm/build`
4. preuzeti BiH, Hrvatska, Srbija, Slovenija extracte
5. merge u jedan `.osm.pbf`
6. pokrenuti `extract`
7. pokrenuti `partition`
8. pokrenuti `customize`
9. pokrenuti `osrm-routed`
10. testirati `curl`
11. postaviti `OSRM_BASE_URL` u aplikaciji
12. `pm2 restart transport-app`

## 17. Pomoćna skripta

U repozitoriju je dodana pomoćna skripta:

- [scripts/setup-osrm-west-balkan.sh](/Users/emir_mw/transport/scripts/setup-osrm-west-balkan.sh)

Skripta:

- preuzima 4 extracta
- radi merge
- pokreće `extract`
- pokreće `partition`
- pokreće `customize`

Skripta ne starta trajni `osrm-routed` container, to i dalje radite kroz `docker run` ili `docker compose`.

Za vaš setup najrelevantnije je `docker run`.

## 18. Zvanični izvori

- OSRM backend repository i quick start:
  https://github.com/Project-OSRM/osrm-backend
- OSRM container image:
  https://github.com/project-osrm/osrm-backend/pkgs/container/osrm-backend
