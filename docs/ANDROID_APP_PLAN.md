# Android App Plan

Ovaj dokument definiše plan kako postojeći transport sistem prebaciti na Android aplikaciju, uz zadržavanje istog backend-a koji već koristi web aplikacija.

## Cilj

Cilj nije praviti novi sistem od nule, nego:

- zadržati postojeći `Next.js + Prisma + PostgreSQL` backend
- zadržati postojeću poslovnu logiku
- dodati poseban Android frontend
- omogućiti da web i Android rade paralelno nad istim podacima

## Osnovna odluka

Preporučeni pristup:

- Android app raditi u `React Native` / `Expo`
- backend ostaje postojeći `app/api/...`
- po potrebi dodati nove mobilne API slojeve samo tamo gdje je korisno
- autentikaciju standardizovati tako da radi i za web i za mobile

Razlog za ovaj pristup:

- najbrži je za isporuku
- može se iskoristiti postojeći frontend know-how iz React/Next projekta
- omogućava kasnije i iOS ako zatreba
- ne veže nas za WebView rješenje koje bi bilo lošije za mape, GPS i UX

## Šta ne radimo

Ne preporučuje se:

- pakovati postojeći web u `WebView`
- pokušati direktno reuse-ati `Leaflet` web komponente u mobilnoj aplikaciji
- prenositi sve admin/dispečer funkcije u prvoj verziji

## Trenutno stanje projekta

Postojeći sistem već ima dobru osnovu za mobile:

- `JWT` login i refresh token logiku
- dio ruta već podržava `Authorization: Bearer`
- jasne role:
  - `ADMIN`
  - `DISPATCHER`
  - `DRIVER`
  - `CLIENT`
- postojeće module:
  - live mapa
  - route replay
  - Schengen
  - dokumenti
  - load management
  - inspekcije
  - notifikacije
  - klijentski portal

Bitna tehnička napomena:

- postojeća auth logika je djelimično mobile-spremna
- ali nije još potpuno standardizovana na svim zaštićenim rutama
- to je prvi backend zadatak prije ozbiljne mobilne implementacije

## Predloženi scope prve verzije

Prva Android verzija treba biti fokusirana i operativno korisna.

### MVP za `DRIVER`

- [x] Login / logout
- [x] Restore session pri otvaranju aplikacije
- [ ] Moj profil
- [x] Moj Schengen pregled
- [x] Lista mojih prelazaka granice
- [x] Otvaranje replay-a za prelazak granice
- [x] Moji loadovi
- [x] Detalji loada
- [x] Moja trenutna / zadnja lokacija
- [x] Route replay
- [ ] Inspekcije
- [ ] Dokumenti relevantni za vozača

### MVP za `CLIENT`

- [x] Login / logout
- [x] Restore session
- [x] Profil klijenta
- [x] Lista loadova
- [x] Detalji loada
- [x] Live mapa
- [x] Notifikacije

### Šta ostaje za kasnije faze

- [ ] `ADMIN` dashboard
- [ ] `DISPATCHER` kompletan operativni modul
- [ ] finansijski izvještaji
- [ ] kompleksni CRUD ekrani za upravljanje cijelim sistemom
- [ ] napredni analytics/reporting ekrani

## Predložena tehnička arhitektura

### Mobile frontend

- [x] Napraviti novi folder `mobile/`
- [x] Postaviti `Expo` projekat sa `TypeScript`
- [ ] Dodati `React Navigation`
- [ ] Dodati `TanStack Query` za API cache/fetch
- [x] Dodati `expo-secure-store` za tokene
- [x] Dodati centralni auth store, npr. `Zustand`

Predloženi stack:

- `Expo`
- `React Native`
- `TypeScript`
- `React Navigation`
- `TanStack Query`
- `Zustand`
- `expo-secure-store`
- `react-native-maps`

### Backend

Backend ostaje postojeći, ali ga treba pripremiti za mobile:

- [x] Ujednačiti auth čitanje preko `Bearer` tokena i cookie-ja
- [x] Napraviti shared auth helper koji koriste sve zaštićene rute
- [x] Evidentirati koje rute koristi web, a koje će koristiti mobile
- [x] Po potrebi napraviti agregirane mobile rute za ekrane koji traže više podataka odjednom

### Mape

Postojeći web koristi `Leaflet`. Android ne treba koristiti isti map rendering sloj.

Za mobile:

- [x] Koristiti `react-native-maps`
- [x] Zadržati `OpenStreetMap` tile pristup
- [x] Implementirati live map prikaz nativno
- [x] Implementirati replay map prikaz nativno

Važno:

- poslovna logika i API ostaju isti
- samo se map UI implementira posebno za mobile

## Faze implementacije

## Faza 1: Analiza i priprema backend-a

Cilj ove faze je da backend postane pouzdana osnova za mobilni klijent.

- [ ] Proći sve auth-protected rute
- [x] Proći i prebaciti ključne rute potrebne za `DRIVER` i `CLIENT` MVP
- [x] Identifikovati rute koje čitaju samo cookie i proširiti ih na `Authorization: Bearer`
- [x] Napraviti jedan shared helper, npr. `getAuthUserFromRequest()`
- [ ] Standardizovati response format za `401`, `403`, `404`, `500`
- [ ] Provjeriti koje rute koriste role check i ujednačiti pristup
- [x] Napraviti listu svih ruta koje su potrebne za `DRIVER` mobile
- [x] Napraviti listu svih ruta koje su potrebne za `CLIENT` mobile
- [x] Označiti koje postojeće rute su dovoljne bez izmjena
- [x] Označiti koje rute treba doraditi
- [x] Označiti koje nove rute treba dodati

Rezultat faze:

- backend spreman da ga koristi Android app bez oslanjanja na browser specifično ponašanje

## Faza 2: Definisanje mobilnog API sloja

Ne treba praviti duplikat cijelog API-ja. Treba napraviti samo ono što olakšava mobilne ekrane.

Moguće mobile-friendly rute:

- [ ] `GET /api/mobile/me`
- [x] `GET /api/mobile/driver/dashboard`
- [ ] `GET /api/mobile/driver/schengen`
- [ ] `GET /api/mobile/driver/loads`
- [ ] `GET /api/mobile/driver/load/:id`
- [ ] `GET /api/mobile/driver/replay`
- [ ] `GET /api/mobile/client/dashboard`
- [ ] `GET /api/mobile/client/loads`
- [ ] `GET /api/mobile/client/live-map`

Napomena:

- ove rute nisu obavezne ako postojeće rute već daju dobar payload
- treba ih dodati samo gdje smanjuju broj requestova i pojednostavljuju mobile UI

Rezultat faze:

- jasna mapa backend endpointa koje Android koristi

Napomena o trenutnom stanju:

- postojeći mobile kod trenutno koristi kombinaciju:
  - postojećih web API ruta
  - jednog agregiranog mobile endpointa `GET /api/mobile/driver/dashboard`
- `GET /api/mobile/driver/dashboard` je dovoljan za prvi `DRIVER` home ekran
- dodatni mobile-specifični endpointi još nisu nužni blocker za MVP, ali mogu kasnije pomoći za performanse i čišći API sloj

## Faza 3: Setup Android projekta

- [x] Kreirati `mobile/` aplikaciju
- [x] Inicijalizovati Expo projekat
- [x] Postaviti `tsconfig`
- [x] Postaviti folder strukturu
- [x] Konfigurisati env varijable za API base URL
- [x] Dodati auth store
- [x] Dodati API client sa interceptorima
- [x] Dodati secure storage za refresh token
- [x] Dodati osnovni app shell
- [x] Dodati `.env` i `.env.example`
- [x] Dodati `EAS` konfiguraciju za interni APK build

Predložena struktura:

```text
mobile/
  src/
    api/
    components/
    navigation/
    screens/
    features/
    store/
    hooks/
    types/
    utils/
```

Rezultat faze:

- pokrenut prazan Android app povezan sa backendom
- [x] `npm install` u `mobile/`
- [x] `npx expo export --platform android --output-dir dist`
- [x] Expo/EAS konfiguracija za interni APK build
- [x] Root web build izolovan od `mobile/` React Native koda

## Faza 4: Auth i session management

Ovo je kritična faza jer od nje zavise svi ekrani.

- [x] Implementirati login screen
- [x] Pozvati postojeći `/api/auth/login`
- [x] Sačuvati `access token`
- [x] Sačuvati `refresh token` u secure storage
- [x] Implementirati `me` endpoint fetch nakon logina
- [x] Implementirati restore session pri startu aplikacije
- [x] Implementirati refresh token flow
- [x] Implementirati logout
- [x] Implementirati auto-redirect po roli

Posebno provjeriti:

- [x] da `DRIVER` ne može vidjeti tuđe podatke
- [x] da `CLIENT` ne može vidjeti interne operativne podatke
- [x] da backend role check ostane izvor istine

Rezultat faze:

- stabilan mobilni auth flow

## Faza 5: Driver MVP ekrani

Ovo je vjerovatno najvažniji dio prve verzije.

### Driver Home

- [x] Napraviti početni ekran za vozača
- [x] Prikazati osnovne statuse
- [x] Prikazati assigned truck ako postoji
- [x] Prikazati active load ako postoji
- [x] Prikazati brze ulaze/sekcije prema Schengen/replay/loadovima

### Driver Schengen

- [x] Prikazati iskorištene dane
- [x] Prikazati preostale dane
- [x] Prikazati period obračuna
- [x] Prikazati listu prelazaka
- [x] Omogućiti otvaranje replay-a za konkretan prelazak
- [ ] Omogućiti export ako kasnije bude potreban i na mobile

### Driver Loads

- [x] Lista loadova
- [ ] Filter osnovnih statusa
- [x] Detalji loada
- [x] Pickup/delivery informacije
- [x] Status timeline
- [x] Vozila i stopovi na loadu

### Driver Replay i lokacija

- [x] Live status lokacije
- [x] Replay lista perioda ili ručni odabir
- [x] Prikaz rute na mapi
- [x] Fokus na border crossing događaj kada je otvoren iz Schengen ekrana

### Driver Documents

- [ ] Lista dokumenata
- [ ] Otvaranje dokumenta
- [ ] Prikaz expiry informacija gdje je relevantno

### Driver Inspections

- [ ] Lista inspekcija
- [ ] Kreiranje ili pregled ako backend podržava potreban tok

Rezultat faze:

- [x] vozač ima funkcionalnu aplikaciju za svakodnevnu upotrebu

## Faza 6: Client MVP ekrani

### Client Home

- [x] Osnovni pregled klijentskih aktivnosti
- [x] Brzi ulaz u loadove i live mapu

### Client Loads

- [x] Lista loadova
- [x] Detalji loada
- [x] Status i osnovni tok pošiljke

### Client Live Map

- [x] Prikaz aktivnih pošiljki / vozila
- [x] Prikaz osnovne lokacije i statusa

### Client Notifications

- [x] Lista notifikacija
- [x] Prikaz detalja
- [x] Mark as read
- [x] Mark all as read

### Client Profile

- [x] Prikaz podataka klijenta

Rezultat faze:

- [x] klijentski portal radi i na Androidu

## Faza 7: Mobile UX i navigacija

Web raspored ne treba kopirati na telefon.

- [ ] Definisati `Bottom Tab` navigaciju za glavne module
- [ ] Definisati `Stack` navigaciju za detalje
- [ ] Napraviti dizajn prilagođen vozaču u pokretu
- [ ] Smanjiti broj klikova za najčešće radnje
- [ ] Obezbijediti dobar prikaz na manjim ekranima
- [ ] Dodati loading, empty i error state za svaki ekran
- [x] Napraviti funkcionalan role-based app shell i sekcijsku navigaciju unutar MVP ekrana

Predloženi tabovi za `DRIVER`:

- [ ] Home
- [ ] Loads
- [ ] Schengen
- [ ] Replay
- [ ] Profile

Predloženi tabovi za `CLIENT`:

- [ ] Home
- [ ] Loads
- [ ] Live Map
- [ ] Notifications
- [ ] Profile

## Faza 8: Notifikacije

Mobile treba iskoristiti i za push notifikacije.

- [ ] Odabrati push sistem, `Expo Notifications` ili `Firebase`
- [ ] Sačuvati device token
- [ ] Povezati device token sa korisnikom
- [ ] Definisati događaje koji šalju push

Predloženi događaji:

- [ ] Novi load
- [ ] Promjena statusa loada
- [ ] Schengen upozorenje
- [ ] Istek dokumenta
- [ ] Klijentska status notifikacija

## Faza 9: Testiranje

- [ ] Testirati login/logout
- [ ] Testirati restore session
- [ ] Testirati role access
- [ ] Testirati Schengen podatke
- [ ] Testirati route replay
- [ ] Testirati mape na više Android uređaja
- [ ] Testirati dokumente i file preview
- [ ] Testirati error handling kada nema interneta
- [ ] Testirati spore mreže
- [ ] Testirati crash scenarije

Posebno:

- [ ] Testirati rute blizu granice i otvaranje replay-a iz Schengen ekrana
- [ ] Testirati klijentski live map pregled
- [ ] Testirati da nema curenja podataka između rola

## Faza 10: Interni rollout

- [ ] Napraviti internu testnu build verziju
- [ ] Instalirati na nekoliko Android uređaja
- [ ] Testirati sa 1-2 vozača
- [ ] Testirati sa 1 klijent nalogom
- [ ] Prikupiti feedback
- [ ] Ispraviti MVP probleme

## Faza 11: Produkcijska priprema

- [ ] Definisati produkcijski API base URL za mobile
- [ ] Provjeriti CORS i sigurnosna pravila po potrebi
- [ ] Definisati release signing za Android
- [ ] Dodati crash reporting
- [ ] Dodati basic analytics ako je potreban
- [ ] Pripremiti release notes

## Faza 12: Kasnije faze

Nakon MVP-a može se širiti scope:

- [ ] `ADMIN` mobilni pregled
- [ ] `DISPATCHER` operativni modul
- [ ] upload dokumenata direktno sa telefona
- [ ] mobilne forme za incidente
- [ ] napredne push notifikacije
- [ ] offline mode za dio funkcionalnosti
- [ ] iOS verzija

## API mapiranje po modulu

Ovo je početna radna mapa šta se može reuse-ati.

### Auth

- [x] `/api/auth/login`
- [x] `/api/auth/me`
- [x] `/api/auth/refresh`
- [x] `/api/auth/logout`

### Driver

- [ ] `/api/drivers/[id]`
- [x] `/api/drivers/[id]/positions`
- [x] `/api/drivers/[id]/schengen`
- [ ] `/api/drivers/[id]/performance`
- [x] `/api/drivers/location`
- [x] `/api/mobile/driver/dashboard`

### Loads

- [x] `/api/loads`
- [x] `/api/loads/[id]`
- [ ] `/api/loads/[id]/status`
- [ ] `/api/loads/[id]/pickup`
- [ ] `/api/loads/[id]/deliver`
- [ ] `/api/loads/[id]/eta`

### Client

- [x] `/api/client/profile`
- [x] `/api/client/loads`
- [x] `/api/client/live-map`
- [x] `/api/client/notifications`

### Documents

- [ ] `/api/documents`
- [ ] `/api/documents/[id]`
- [ ] `/api/documents/[id]/download`

### Inspections

- [ ] `/api/inspections`
- [ ] `/api/inspections/[id]`

## Rizici

### 1. Auth nedosljednost između web i mobile

Rizik:

- neke rute možda i dalje zavise od cookie auth modela

Mitigacija:

- [x] standardizovati auth helper prije frontend implementacije

### 2. Mape i replay na mobile

Rizik:

- web map komponente se ne mogu direktno prenijeti

Mitigacija:

- [x] planirati replay i live map kao nativne mobile komponente od početka

### 3. Scope creep

Rizik:

- pokušaj da se prenese cijeli admin sistem u prvoj verziji

Mitigacija:

- [ ] strogo držati MVP scope za `DRIVER` i `CLIENT`

### 4. Performanse

Rizik:

- veliki payloadi i više requestova po ekranu

Mitigacija:

- [x] dodati agregirane mobile rute gdje je potrebno
- [ ] koristiti cache i pagination

## Preporučeni redoslijed rada

Ovo je praktični redoslijed koji minimizira rizik:

- [x] 1. Standardizovati auth backend za mobile
- [x] 2. Napraviti listu svih MVP ekrana
- [x] 3. Napraviti `mobile/` Expo projekat
- [x] 4. Implementirati auth flow
- [x] 5. Implementirati `DRIVER` Home + Schengen + Replay
- [x] 6. Implementirati `DRIVER` Loads
- [x] 7. Implementirati `CLIENT` Home + Loads + Live Map
- [x] 8. Dodati notifikacije
- [ ] 9. Odraditi interno testiranje
- [ ] 10. Ispraviti probleme i pripremiti release

## Procjena prioriteta

### Prioritet 1

- [x] Auth
- [x] Driver MVP
- [x] Client MVP
- [x] Replay
- [x] Schengen

### Prioritet 2

- [ ] Dokumenti
- [ ] Inspekcije
- [ ] Push notifikacije

### Prioritet 3

- [ ] Admin/dispečer mobile moduli
- [ ] Napredni izvještaji
- [ ] Offline funkcionalnosti

## Zaključak

Najispravniji pristup je:

- zadržati backend kakav jeste
- napraviti poseban Android frontend
- prvo isporučiti `DRIVER` i `CLIENT` MVP
- admin/dispečer ostaviti za kasnije

Time se najbrže dobija stvarna Android aplikacija bez razbijanja postojećeg web sistema.

## Preostalo Za Runtime I Rollout

Ovo je realna lista šta još treba uraditi nakon dosadašnje implementacije.

### Lokalni runtime test

- [ ] Pokrenuti backend lokalno preko `npm run dev`
- [ ] Pokrenuti Expo dev server u `mobile/`
- [ ] Pokrenuti Android emulator i podići app preko `npm run android`
- [ ] Testirati login za `DRIVER`
- [ ] Testirati login za `CLIENT`
- [ ] Testirati `.env` konekciju prema lokalnom backendu

### Test na fizičkom uređaju

- [ ] Postaviti `EXPO_PUBLIC_API_BASE_URL` na LAN IP računara
- [ ] Pokrenuti Expo app na fizičkom Android uređaju
- [ ] Potvrditi da uređaj vidi backend preko lokalne mreže
- [ ] Testirati `DRIVER` flow na fizičkom uređaju
- [ ] Testirati `CLIENT` flow na fizičkom uređaju

### Interni APK build

- [x] Pripremiti `eas.json` za interni `apk` build
- [x] Dodati build skripte u `mobile/package.json`
- [ ] `npx eas login`
- [ ] `npx eas build:configure`
- [ ] Napraviti prvi `preview` APK build
- [ ] Napraviti prvi `production` APK build za internu distribuciju
- [ ] Skinuti APK i ručno instalirati na test uređaje

### Funkcionalno što još nije završeno

- [ ] `DRIVER` dokumenti
- [ ] `DRIVER` inspekcije
- [ ] filteri za driver loadove
- [ ] pravi `React Navigation` tab/stack flow
- [ ] dodatni UI polish i empty/error/retry stanja
- [ ] push notifikacije
- [ ] crash reporting
- [ ] release signing verifikacija kroz stvarni build

### Organizacija internog rollouta

- [ ] Definisati ko testira `DRIVER` naloge
- [ ] Definisati ko testira `CLIENT` naloge
- [ ] Pripremiti internu uputu za instalaciju APK-a
- [ ] Definisati način distribucije:
  - ručno slanje APK-a
  - ili MDM kasnije

## Šta Je Urađeno Do Sada

Ovo je sažetak stvarno završenih tehničkih koraka u kodu.

### Backend i auth

- [x] Dodan shared mobile-friendly auth helper `lib/api-auth.ts`
- [x] Podržani `Bearer` token i cookie auth u istom helperu
- [x] Ključne `DRIVER` i `CLIENT` API rute prebačene na shared auth helper
- [x] Ograničen pristup driver pozicijama tako da `DRIVER` vidi samo svoje podatke
- [x] Dodan `GET /api/mobile/driver/dashboard`
- [x] Očišćeni Next build warning-i za dinamičke API rute

### Mobile app osnova

- [x] Kreiran `mobile/` projekat
- [x] Instalirane osnovne Expo/React Native zavisnosti
- [x] Dodani `SecureStore`, `Zustand`, `react-native-maps` i `EAS`
- [x] Podešen `API_BASE_URL` za emulator i `.env` override
- [x] Dodana Expo export provjera za Android bundle
- [x] Dodan interni `apk` build put preko `EAS`

### Mobile auth flow

- [x] Login screen
- [x] Session bootstrap pri startu aplikacije
- [x] `refresh token` flow
- [x] `me` fetch nakon logina
- [x] Logout
- [x] Role-based routing za `DRIVER`, `CLIENT`, `ADMIN`, `DISPATCHER`

### Driver MVP

- [x] Driver home pregled
- [x] Schengen pregled
- [x] Lista prelazaka granice
- [x] Replay otvaranje iz Schengen prelaza
- [x] Native replay mapa
- [x] Loads lista
- [x] Load details
- [x] Pickup/delivery podaci
- [x] Stopovi i vozila na loadu
- [x] Status timeline

### Client MVP

- [x] Client home pregled
- [x] Loads lista
- [x] Load details
- [x] Native live mapa
- [x] Notifikacije
- [x] Mark single notification as read
- [x] Mark all notifications as read
- [x] Client profil

## Šta Je Ostalo

Ovo su realne otvorene stavke prije ozbiljnog internog korištenja.

### Runtime i distribucija

- [ ] Prvo pokretanje na Android emulatoru
- [ ] Prvo pokretanje na fizičkom Android uređaju
- [ ] Prvi stvarni `preview APK` build
- [ ] Prvi stvarni `production APK` build
- [ ] Test instalacija APK-a na više uređaja

### Funkcionalne rupe u MVP-u

- [ ] `DRIVER` dokumenti
- [ ] `DRIVER` inspekcije
- [ ] filteri za driver loadove
- [ ] pravi `React Navigation` sa tab/stack navigacijom
- [ ] detaljniji loading/error/empty state-ovi

### Produkcijska priprema

- [ ] push notifikacije
- [ ] crash reporting
- [ ] release signing provjera kroz stvarni build
- [ ] interni rollout proces i test korisnici
