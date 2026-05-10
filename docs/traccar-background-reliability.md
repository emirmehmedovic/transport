# Traccar Background Pouzdanost

Ovaj dokument služi kao operativni vodič za podešavanje `Traccar Client` aplikacije tako da GPS praćenje bude što pouzdanije u pozadini na `iOS` i `Android` uređajima.

Važno:

- nijedna mobilna aplikacija ne može garantovati `100%` neprekidan background rad u svim uslovima
- `iOS` i `Android` mogu privremeno zaustaviti ili ograničiti aplikaciju zbog baterije, mreže, dozvola ili policy-ja proizvođača
- cilj ovog vodiča je da tracking radi što stabilnije i da se minimizira gubitak pozicija

## 1. Šta je najvažnije

Za stabilan rad u pozadini moraju biti ispunjena sva 4 uslova:

1. `Traccar Client` mora imati ispravan `Server URL` i tačan `Device Identifier`
2. telefon mora dati aplikaciji `Always` ili ekvivalentnu background lokacijsku dozvolu
3. štednja baterije i optimizacija aplikacije moraju biti isključene
4. vozač ne smije ručno gasiti aplikaciju ili joj zabraniti background rad

Ako ijedna od ove 4 stavke nije ispravna, tracking može kasniti, prorijediti se ili potpuno stati.

## 2. Preporučene Traccar postavke

Ove postavke su dobar balans između pouzdanosti i potrošnje baterije.

### Obavezno

- `Server URL`: `https://vasa-domena.com/api/telemetry?key=VAS_KLJUC`
- `Device Identifier`: mora biti isti kao `Traccar Device ID` u našem sistemu
- `Method`: `POST`
- `Start on boot`: uključeno
- `Stop on terminate`: isključeno
- `Heartbeat interval`: `60`

### Preporučeno za bolji replay

- `Distance filter`: `20` do `30` metara
- ne koristiti previsok `distanceFilter` kao `50` ili više ako želite gušću rutu
- ako je prioritet kvalitet replay-a, koristiti `20`
- ako je prioritet baterija, koristiti `30`

### Batch i offline sync

- `batchSync = 0` je prihvatljivo i kod nas radi
- ako se nekad uključi `batchSync = 1`, backend sada podržava i batch payload
- bitnije od batch moda je da aplikacija ima dozvolu da uopšte nastavi raditi u pozadini i da lokalno čuva zapise dok nema mreže

### Preporučeno izbjegavati

- previsok `distanceFilter`
- ručno gašenje aplikacije iz app switchera
- agresivne battery saver profile
- korištenje `When In Use` umjesto `Always` dozvole

## 3. iOS preporuke

### Traccar postavke

Preporučeno:

- `Location authorization`: `Always`
- `Distance filter`: `20` do `30`
- `Stop on stationary`: isključeno
- `Disable stop detection`: uključeno ako postoji ta opcija i ako želite agresivnije praćenje
- `Pauses location updates automatically`: isključiti ako aplikacija/klijent to podržava kroz UI ili profil
- `Start on boot`: uključeno gdje je primjenjivo

Napomena:

- na `iOS` sistem i dalje može usporiti tracking kad uređaj dugo miruje, kad je baterija niska ili kad korisnik ograniči lokaciju
- `iOS` posebno agresivno štedi bateriju kad procijeni da aplikacija ne treba stalno raditi

### iPhone sistemske postavke

Provjeriti:

1. `Settings` → `Privacy & Security` → `Location Services` → uključeno
2. `Settings` → `Privacy & Security` → `Location Services` → `Traccar Client`
3. dozvola mora biti `Always`
4. `Precise Location` uključeno
5. `Background App Refresh` uključeno:
   `Settings` → `General` → `Background App Refresh`
6. `Low Power Mode` držati isključen dok traje vožnja:
   `Settings` → `Battery` → `Low Power Mode` = off

### Šta vozač ne smije raditi na iOS

- ne birati `Allow Once`
- ne mijenjati dozvolu na `While Using the App`
- ne gasiti `Precise Location`
- ne swipe-ovati aplikaciju iz app switchera ako tracking treba ostati aktivan
- ne koristiti `Low Power Mode` tokom dužih vožnji ako očekujete gust replay

## 4. Android preporuke

Android je često pouzdaniji za kontinuiran tracking, ali problem pravi vendor battery management.

### Traccar postavke

Preporučeno:

- `Location accuracy`: `High`
- `Distance filter`: `20` do `30`
- `Start on boot`: uključeno
- `Stop on terminate`: isključeno
- `Heartbeat interval`: `60`
- `Foreground notification` ili indikator aktivnog trackinga držati uključen ako aplikacija to koristi

### Android sistemske postavke

Obavezno provjeriti:

1. `Settings` → `Apps` → `Traccar Client` → `Permissions`
2. `Location` mora biti `Allow all the time`
3. `Use precise location` uključeno
4. `Battery` ili `App battery usage`:
   postaviti `Unrestricted`
5. `Mobile data` i `Wi-Fi` pristup ne smije biti ograničen u pozadini
6. `Autostart` uključiti ako uređaj ima tu opciju
7. `Background activity` mora biti dozvoljen ako vendor UI to posebno traži

### Posebno za Samsung, Xiaomi, Huawei, Oppo, Vivo, Realme

Na ovim uređajima dodatno provjeriti vendor battery manager:

- `Sleeping apps`
- `Deep sleeping apps`
- `Adaptive battery`
- `Auto optimize`
- `Auto launch`
- `Background restrictions`

`Traccar Client` ne smije biti ni u jednoj listi koja ga uspavljuje ili zatvara.

### Šta vozač ne smije raditi na Androidu

- ne uključivati `Battery Saver` tokom vožnje
- ne stavljati aplikaciju u `sleeping apps`
- ne ručno `Force stop`
- ne gasiti stalnu notifikaciju ako je prikazana
- ne ograničavati background data

## 5. Preporučeni profil za replay kvalitet

Ako vam je prioritet da ruta bude što manje "isprekidana":

- `Distance filter`: `20`
- `Heartbeat interval`: `60`
- background dozvole potpuno uključene
- battery optimization potpuno isključena
- telefon na punjaču tokom dužih vožnji kad god je moguće

Ako vam je prioritet štednja baterije uz prihvatljiv replay:

- `Distance filter`: `30`
- `Heartbeat interval`: `60`

Ako stavite `Distance filter = 50` ili više:

- potrošnja baterije će biti niža
- ali replay će imati veće skokove između tačaka

## 6. Kako prepoznati problem

Simptomi da background tracking nije stabilan:

- u replay-u postoje veliki skokovi između dvije tačke
- `recordedAt` ima rupe od više desetina minuta ili više sati
- `receivedAt` je mnogo kasniji od `recordedAt`
- vozač se ne pojavljuje redovno na live mapi
- zadnja lokacija se ne mijenja iako se vozilo kreće

To obično znači jedno od sljedećeg:

- telefon nije generisao dovoljno GPS tačaka
- aplikacija je bila ograničena u pozadini
- nije bilo mreže pa je došlo do kasnijeg dumpa
- korisnik je zatvorio aplikaciju ili promijenio dozvole

## 7. Test procedura nakon instalacije

Nakon podešavanja obavezno uraditi test.

### Brzi test

1. otvoriti `Traccar Client`
2. potvrditi da je tracking uključen
3. zaključati telefon
4. odvesti kratku rutu `10` do `15` minuta
5. provjeriti u našem sistemu da li se pojavljuju nove pozicije
6. otvoriti replay i potvrditi da nema velikih rupa

### Offline test

1. uključiti tracking
2. isključiti internet na telefonu `10` do `15` minuta tokom kretanja
3. ponovo uključiti internet
4. provjeriti da li su stare tačke kasnije stigle
5. provjeriti odnos `recordedAt` i `receivedAt`

Ako stare tačke stignu kasnije, offline buffering radi ispravno.

## 8. Operativna pravila za vozače

Vozač treba dobiti kratko pravilo:

- prije polaska provjeriti da je tracking uključen
- ne gasiti aplikaciju tokom smjene
- držati telefon na punjaču kad god je moguće
- ne uključivati battery saver tokom vožnje
- ako se telefon restartuje, provjeriti da je tracking opet aktivan
- ako se promijeni dozvola lokacije, odmah vratiti `Always`

## 9. Preporuka za naš sistem

Za vašu upotrebu preporuka je:

- `iOS` i `Android` oba podržati
- na `iOS` koristiti konzervativno očekivanje i obavezne provjere dozvola
- na `Android` insistirati na `Unrestricted battery` i `Allow all the time`
- standardizovati `Distance filter = 20` za vozače kojima je replay važan
- standardizovati `Distance filter = 30` ako želite nešto manju potrošnju baterije

Ako je cilj "da aplikacija uvijek radi ispravno u pozadini", najtačnija formulacija je:

- aplikaciju treba podesiti tako da radi `što pouzdanije moguće`
- zatim operativno kontrolisati dozvole, bateriju, mrežu i ponašanje vozača

Na `iOS` i `Android` ne postoji tehnička garancija da će tracking baš uvijek biti potpuno neprekinut, ali uz ovaj profil može biti dovoljno stabilan za operativni rad i kvalitetan replay.
