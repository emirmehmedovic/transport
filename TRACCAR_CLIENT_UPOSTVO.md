# Traccar Client Uputstvo

Ovo uputstvo služi za podešavanje `Traccar Client` aplikacije na telefonu vozača tako da GPS pozicije pravilno stižu u sistem.

## 1. Server konfiguracija

Na serveru u `.env` mora postojati varijabla:

```env
TELEMETRY_SHARED_KEY=VAŠ_SIGURNOSNI_KLJUČ
```

Nakon dodavanja ili izmjene `.env` fajla, aplikaciju treba restartati.

## 2. Šta se unosi u Traccar Client

U `Traccar Client` aplikaciji potrebno je podesiti:

- `Server URL`
- `Device Identifier`

### Server URL

Format URL-a je:

```text
https://trucking.hps.ba/api/telemetry?key=VAŠ_SIGURNOSNI_KLJUČ
```

Važno:

- svi vozači koriste isti `Server URL`
- ključ se ne mijenja po vozaču
- URL mora biti unesen tačno, bez dodatnih razmaka

### Device Identifier

`Device Identifier` mora biti jedinstven za svakog vozača i mora odgovarati vrijednosti upisanoj u sistemu u polju `Traccar Device ID`.

Primjeri:

- `KAMION-01`
- `KAMION-02`
- `KAMION-03`

Važno:

- svaki vozač mora imati svoj poseban `Device Identifier`
- isti identifikator mora biti upisan:
  - u našem sistemu na profilu vozača
  - u `Traccar Client` aplikaciji na telefonu tog vozača

## 3. Redoslijed podešavanja

1. U sistemu otvoriti vozača i upisati `Traccar Device ID`.
2. Na serveru provjeriti da je postavljen `TELEMETRY_SHARED_KEY`.
3. Restartati aplikaciju ako je `.env` mijenjan.
4. Na telefonu otvoriti `Traccar Client`.
5. U polje `Server URL` unijeti telemetry URL sa `key` parametrom.
6. U polje `Device Identifier` unijeti odgovarajući ID tog vozača.
7. Sačuvati podešavanja i uključiti slanje lokacije.

## 4. Provjera da li radi

Nakon podešavanja provjeriti:

- da li se vozaču ažurira zadnja lokacija
- da li se pojavljuje na `Live Mapi`
- da li se mijenja vrijeme zadnjeg GPS update-a

Ako se lokacija ne pojavljuje, provjeriti:

- da li je `Server URL` ispravan
- da li `key` u URL-u odgovara server konfiguraciji
- da li `Device Identifier` odgovara `Traccar Device ID` u sistemu
- da li telefon ima dozvolu za lokaciju
- da li aplikacija ima pristup internetu

## 5. Napomene

- `Server URL` je isti za sve vozače
- `Device Identifier` je različit za svakog vozača
- sigurnosni ključ ne treba slati u dokumentima, e-mailovima ili chat porukama bez potrebe
- ako se sigurnosni ključ ikad promijeni, mora se ažurirati i server i `Server URL` u `Traccar Client` aplikaciji

## 6. Background Rad

Za detaljna podešavanja kako da `Traccar Client` što pouzdanije radi u pozadini na `iOS` i `Android` uređajima pogledati:

- [docs/traccar-background-reliability.md](/Users/emir_mw/transport/docs/traccar-background-reliability.md)
