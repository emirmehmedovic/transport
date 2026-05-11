# Android Runtime And Deploy Checklist

Ovaj dokument je praktična operativna lista za stvarno pokretanje Android aplikacije, testiranje i internu distribuciju APK-a.

## 1. Backend lokalno

- [ ] U root projektu pokrenuti backend:

```bash
npm run dev
```

- [ ] Potvrditi da web aplikacija radi na `http://localhost:3000`
- [ ] Potvrditi da login radi za test `DRIVER` nalog
- [ ] Potvrditi da login radi za test `CLIENT` nalog

## 2. Mobile lokalno

U `mobile/` folderu:

- [x] `npm install`
- [x] `npx expo export --platform android --output-dir dist`
- [x] Dodan `mobile/.env` sa emulator base URL-om
- [x] Dodan `eas.json` za interni `apk` build
- [x] Dodane `build:apk:preview` i `build:apk:production` skripte
- [ ] Pokrenuti Expo dev server:

```bash
npm run start
```

## 3. Android emulator

- [ ] Otvoriti Android Studio
- [ ] Pokrenuti Android emulator
- [ ] Provjeriti da emulator koristi backend preko:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

- [ ] Pokrenuti app:

```bash
npm run android
```

- [ ] Testirati `DRIVER` login
- [ ] Testirati `CLIENT` login
- [ ] Testirati `DRIVER` Schengen
- [ ] Testirati `DRIVER` Replay
- [ ] Testirati `DRIVER` Loads
- [ ] Testirati `CLIENT` Loads
- [ ] Testirati `CLIENT` Live Map
- [ ] Testirati `CLIENT` Notifications

## 4. Fizički Android uređaj

- [ ] Povezati telefon i računar na istu mrežu
- [ ] U `mobile/.env` postaviti LAN IP računara, npr:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000
```

- [ ] Restartovati Expo dev server nakon promjene `.env`
- [ ] Pokrenuti app na uređaju
- [ ] Potvrditi da uređaj vidi backend
- [ ] Ponoviti ključne testove za `DRIVER`
- [ ] Ponoviti ključne testove za `CLIENT`

## 5. Interni APK build

U `mobile/` folderu:

- [x] Pripremljen `EAS` build setup u kodu
- [ ] Prijava na EAS:

```bash
npx eas login
```

- [ ] Jednokratna konfiguracija:

```bash
npx eas build:configure
```

- [ ] Preview interni APK:

```bash
npm run build:apk:preview
```

- [ ] Production interni APK:

```bash
npm run build:apk:production
```

- [ ] Skinuti APK sa EAS build rezultata
- [ ] Instalirati APK na test uređaj

## 6. Interna distribucija

- [ ] Definisati ko prima testni APK
- [ ] Pripremiti kratku internu uputu:
  - kako instalirati APK
  - kako dozvoliti instalaciju iz internog izvora
  - kako prijaviti bug
- [ ] Odabrati način distribucije:
  - ručno slanje APK-a
  - interni link
  - MDM u kasnijoj fazi

## 7. Obavezni runtime testovi

### DRIVER

- [ ] login/logout
- [ ] restore session
- [ ] Schengen pregled
- [ ] border crossing replay jump
- [ ] replay mapa
- [ ] loads lista
- [ ] load details
- [ ] status timeline

### CLIENT

- [ ] login/logout
- [ ] restore session
- [ ] loads lista
- [ ] load detail
- [ ] live map
- [ ] notifications
- [ ] mark as read
- [ ] profile

## 8. Šta još nije završeno u kodu

- [ ] `DRIVER` dokumenti
- [ ] `DRIVER` inspekcije
- [ ] load filteri
- [ ] puna navigacija sa tab/stack routingom
- [ ] push notifikacije
- [ ] crash reporting
- [ ] završni UI polish

## 9. Šta je već završeno u kodu

- [x] Shared auth helper za web i mobile
- [x] `Bearer` auth podrška na ključnim `DRIVER` i `CLIENT` rutama
- [x] Mobile login/restore session/refresh token flow
- [x] `DRIVER` Schengen pregled
- [x] `DRIVER` replay otvaranje iz border crossing događaja
- [x] `DRIVER` native replay mapa
- [x] `DRIVER` loads lista i detalji
- [x] `DRIVER` status timeline
- [x] `CLIENT` loads lista i detalji
- [x] `CLIENT` native live mapa
- [x] `CLIENT` notifications i mark-as-read akcije
- [x] `CLIENT` profil
