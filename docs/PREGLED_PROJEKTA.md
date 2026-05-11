# Pregled Projekta

## Šta je ovaj program

Ovo je web aplikacija za upravljanje transportnom firmom. Sistem objedinjuje operativu, vozni park, vozače, transportne naloge, dokumentaciju, finansije, GPS praćenje i klijentski portal u jednoj platformi.

Program je napravljen tako da ga koriste različite uloge:

- `ADMIN`
- `DISPATCHER`
- `DRIVER`
- `CLIENT`

Svaka uloga vidi svoj dio sistema i radi svoj dio procesa.

## Šta program može

### 1. Dashboard i operativni pregled

Program može prikazati centralni dashboard sa:

- aktivnim transportima
- prihodima po periodima
- brojem aktivnih vozača i kamiona
- upozorenjima i alarmima
- mapom aktivnih ruta

Za vozača postoji poseban dashboard sa:

- trenutnim nalogom
- narednim nalogom
- mjesečnom statistikom
- zaradom i kilometrima

### 2. Upravljanje transportnim nalozima

Program može voditi kompletan životni ciklus jednog transporta:

- kreiranje novog loada/rute
- unos pickup i delivery lokacija
- dodavanje više stopova
- unos vozila ili teretnih stavki
- obračun distance i trajanja rute
- unos cijene, napomena i instrukcija
- dodjela vozača i kamiona
- promjena statusa kroz operativni tok

Podržani statusi uključuju:

- `AVAILABLE`
- `ASSIGNED`
- `ACCEPTED`
- `PICKED_UP`
- `IN_TRANSIT`
- `DELIVERED`
- `COMPLETED`
- `CANCELLED`

Program takođe podržava:

- ponavljajuće transporte
- detalje po vozilu unutar loada
- pickup i delivery potvrde
- ETA pregled

Za ponavljajuće poslove postoji i recurring logika:

- kreiranje recurring template-a
- dnevne, sedmične i mjesečne šablone
- automatsko kreiranje novih loadova iz šablona
- standardizacija često ponavljanih relacija

To je bitno za firme koje imaju stalne rute i ugovorene ciklične transporte.

### 3. Mape i rutiranje

Program može koristiti mape za:

- izbor pickup i delivery lokacije
- prikaz rute na mapi
- live mapu aktivnih transporta
- pregled kretanja vozača
- replay historije kretanja vozača
- klijentski live prikaz transporta

`Route replay` je posebno važna funkcija jer omogućava:

- pregled kompletne trase vozača za izabrani period
- filtriranje po datumu i vremenu
- statistiku kretanja
- pregled broja GPS tačaka
- prosječnu brzinu
- procjenu ukupne distance
- full screen prikaz rute
- eksport trase u `GPX` format

To je korisno za:

- internu kontrolu izvršenja vožnje
- provjeru odstupanja od planirane rute
- dokazivanje gdje se vozilo kretalo
- naknadnu analizu spornih situacija
- izvoz podataka u druge GPS/GIS alate

Ruta se može računati automatski preko OSRM servisa, a udaljenost može biti:

- automatski izračunata
- ručno unesena

### 4. GPS i telemetrija

Program može primati GPS podatke sa uređaja/telefona i vezati ih za vozača. Na osnovu toga sistem može:

- čuvati historiju pozicija
- ažurirati zadnju poznatu lokaciju vozača
- prikazivati live mapu
- pratiti kretanje po vremenu
- koristiti geofence logiku i blizinu load lokacija

Program takođe može raditi sa zonama i geofence pravilima:

- kreiranje geofence zona
- definisanje centra i radijusa zone
- aktivne i neaktivne zone
- zone vezane za određeni load
- notifikacije pri ulasku i izlasku iz zone
- evidenciju geofence događaja

Ovo je važno za:

- kontrolu dolaska na pickup ili delivery
- praćenje ulaska u posebne operativne zone
- automatizaciju upozorenja
- precizniji nadzor kretanja na terenu

U projektu postoji integracija sa Traccar pristupom i telemetry endpointima.

### 5. Upravljanje vozačima

Program može voditi kompletnu evidenciju vozača:

- osnovni podaci
- status vozača
- CDL podaci i istek
- medicinski karton i istek
- emergency kontakt
- rate per mile
- GPS uređaj / Traccar uređaj
- godišnji odmor i odsustva
- performanse vozača
- poređenje vozača

Posebno je važna Schengen logika:

- praćenje 90/180 pravila
- agregacija Schengen dana
- ručni override preostalih dana
- pregled po vozaču

### 6. Upravljanje kamionima i prikolicama

Program može upravljati voznim parkom:

- kamioni
- prikolice
- dodjela primarnog i rezervnog vozača
- maintenance evidencija
- troškovi po kamionu
- performanse kamiona
- poređenje kamiona
- kapacitet transporta
- putarine, vinjete i druge dozvole po kamionu

Posebno za međunarodni transport, sistem može voditi:

- `VIGNETTE`
- `TOLLBOX`
- `PERMIT`
- `EMISSION_ZONE`
- ostale cestovne ili ekološke dozvole

Uz to se može pratiti:

- država važenja
- pružalac usluge
- referentni broj
- datum početka i isteka
- status dozvole

To praktično pomaže da vozilo ne krene na rutu bez potrebnih putarina i dozvola.

### 7. Dokumenti i usklađenost

Program može čuvati i organizovati dokumente kao što su:

- `BOL`
- `POD`
- damage report
- slike loada
- rate confirmation
- fuel receipt
- inspection photo
- incident photo
- CDL licenca
- medical card
- insurance
- registration

Sistem može:

- uploadovati dokumente
- pregledati dokumente
- preuzimati dokumente
- pratiti dokumente kojima ističe rok
- generisati alarme za neispravnu ili nepotpunu dokumentaciju

### 8. Inspekcije, incidenti i claims

Program može evidentirati:

- DVIR / driver inspections
- sigurnosni status vozila
- incidente
- severity i status incidenta
- claims postupke

To omogućava firmi da prati operativne probleme i dokumentuje štetu ili nepravilnosti.

### 9. Finansije

Program može pokrivati više finansijskih tokova:

- obračun plata vozača
- pay stub evidenciju
- označavanje isplate
- PDF generisanje platnih listi
- troškove goriva, cestarina, popravki i održavanja
- fakture
- status faktura (`DRAFT`, `SENT`, `PAID`, `OVERDUE`, `VOID`)
- AR/AP pregled
- evidenciju klijenata/kupaca sa osnovnim kontakt podacima

### 10. Izvještaji

Program može generisati i prikazivati izvještaje za:

- prihode
- troškove
- AR/AP
- custom report builder
- performanse vozača
- performanse kamiona

To znači da sistem nije samo operativni alat, nego i alat za analizu poslovanja.

### 11. Alarmi i notifikacije

Program može generisati upozorenja za:

- dokumente koji ističu
- nedostajući POD
- neplaćene pay stubove
- druge operativne ili compliance probleme
- istek putarina, vinjeta i dozvola
- događaje vezane za geofence zone

Podržano je i:

- potvrđivanje/acknowledge alarma
- audit log svih važnih akcija
- Telegram notifikacije

### 12. Klijentski portal

Program ima poseban portal za klijente. Klijent može:

- otvoriti svoj dashboard
- napraviti novi zahtjev za rutu
- odabrati pickup i delivery lokaciju na mapi
- unijeti modele auta i količine
- automatski izračunati rutu
- poslati zahtjev dispečeru/adminu
- pratiti status vlastitih zahtjeva
- pratiti live mapu
- primati obavijesti
- uređivati profil kompanije

Program podržava i approval workflow:

- klijent pošalje zahtjev
- zahtjev ulazi kao `PENDING`
- admin/dispečer odobrava ili odbija
- odobren zahtjev može ići u standardni operativni tok
- klijent dobija obavijest nakon odobrenja

## Kako program može da se koristi

### 1. Kao interni TMS za transportnu firmu

Najvažniji način korištenja je kao centralni sistem za svakodnevni rad firme:

1. Dispečer kreira load ili primi klijentski zahtjev.
2. Unose se ruta, stopovi, vozila/teret i finansijski detalji.
3. Load se dodjeljuje vozaču i kamionu.
4. Vozač prati zadatak kroz dashboard i mijenja status.
5. Sistem prati lokaciju, dokumente i alarme.
6. Na kraju se zatvaraju dokumenti, troškovi i finansijski izvještaji.

### 2. Kao portal za klijente

Klijent može samostalno unijeti zahtjev bez direktnog kontakta sa dispečerom. To znači da program može raditi i kao:

- prodajni ulazni kanal
- self-service portal
- pregled statusa za klijente

### 3. Kao sistem za nadzor flote i vozača

Ako su uključeni GPS podaci i Traccar integracija, program može raditi kao:

- live fleet monitoring alat
- pregled historije kretanja
- kontrola Schengen boravka
- provjera operativnog stanja vozača i vozila

### 4. Kao compliance i dokumentacioni sistem

Program može služiti za:

- praćenje ispravnosti dokumenata
- upravljanje inspekcijama i incidentima
- centralno spremanje svih transportnih dokumenata
- pripremu firme za audit i internu kontrolu

### 5. Kao finansijsko-izvještajni alat

Program može biti baza za:

- obračun plata
- pregled troškova po kamionu ili transportu
- praćenje faktura
- pregled prihoda i profitabilnosti

### 6. Kao alat za forenziku i operativnu provjeru

Zbog `route replay` i GPS historije, program se može koristiti i za:

- rekonstrukciju kretanja vozila
- provjeru da li je vozilo bilo na određenoj lokaciji
- analizu zastoja, skretanja i kašnjenja
- izvođenje GPX zapisa kao dokaza ili arhive

To je posebno korisno kod reklamacija, internih provjera i sporova oko izvršenja transporta.

## Preporučeni tok rada po ulogama

### Admin

- upravlja korisnicima
- prati dashboard
- odobrava ključne procese
- pregleda alarme, audit log i izvještaje

### Dispatcher

- kreira i planira loadove
- dodjeljuje vozače i kamione
- prati status transporta
- prati dokumente i komunikaciju sa klijentom

### Driver

- vidi svoj trenutni i naredni load
- ažurira status vožnje
- radi DVIR/inspekcijske unose
- šalje lokaciju i prati zadatke

### Client

- kreira zahtjev za transport
- prati odobrenje i status
- koristi live mapu i obavijesti
- održava profil kompanije

## Ukratko

Najkraće rečeno, program može biti kompletna operativna platforma za transportnu kompaniju:

- planiranje i izvršenje transporta
- upravljanje vozačima i flotom
- GPS praćenje i mape
- route replay sa statistikama i GPX eksportom
- geofence zone i događaji ulaska/izlaska
- dokumenti i compliance
- toll/vinjete/dozvole po kamionu
- plate, troškovi i fakture
- recurring transportni šabloni
- izvještaji i analitika
- klijentski portal sa approval procesom

Drugim riječima, sistem pokriva put od zahtjeva za transport do završetka ture, dokumentacije, obračuna i izvještavanja.
