# Mobile App

Ovaj folder sadrži stvarnu Expo/React Native Android aplikaciju koja koristi isti backend kao web aplikacija.

## Trenutno spremno

- Expo projekat
- auth flow
- restore session
- refresh token flow
- `DRIVER` mobile MVP ekran
- `CLIENT` mobile MVP ekran
- replay mapa
- Schengen pregled
- loads, load details i timeline
- client live map, profile i notifications
- Expo push registracija uređaja za mobile

## Lokalni env

Fajl [`.env`](./.env) je podešen za Android emulator:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

Ako testiraš na fizičkom Android uređaju, stavi LAN IP računara gdje radi backend, npr:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.50:3000
```

## Pokretanje

1. U root projektu pokreni backend:

```bash
npm run dev
```

2. U `mobile/` folderu pokreni Expo:

```bash
npm install
npm run start
```

3. Za Android emulator:

```bash
npm run android
```

Ako koristiš samo Metro/QR start:

```bash
npx expo start
```

## Verifikacija koja je već prošla

- `npm install` u `mobile/`
- `npx expo export --platform android --output-dir dist`

To znači da app prolazi Expo bundling i da osnovna konfiguracija radi.

## Napomene

- `mobile/` je isključen iz root web `tsconfig` da Next build ne pokušava kompajlirati React Native kod
- web build i dalje prolazi normalno
- za stvarni test na uređaju treba podignut backend i pokrenut Expo app
- za push notifikacije treba stvarni Expo/EAS project ID u `EXPO_PUBLIC_EAS_PROJECT_ID`
- nakon login-a app traži permission za notifikacije i registruje device token na backend

## Interni APK build

Za internu distribuciju bez Play Store-a dodan je [eas.json](./eas.json) sa `apk` profilima.

Prvi put:

```bash
npx eas login
npx eas build:configure
```

Preview APK:

```bash
npm run build:apk:preview
```

Production APK za internu firm­sku distribuciju:

```bash
npm run build:apk:production
```

Napomena:

- oba profila trenutno prave `apk`, ne `aab`
- to je namjerno jer vam treba interna instalacija, ne Play Store release
- EAS će vas pri prvom build-u provesti kroz Android signing ako još nije podešen
