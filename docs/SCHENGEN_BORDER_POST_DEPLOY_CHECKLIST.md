# Schengen & Border Post-Deploy Checklist

Kratka provjera nakon deploymenta za:
- Schengen polygon
- BiH polygon
- granične prelaze
- Schengen obračun

## 1. Seed i granični prelazi

Ako na production bazi još nisi radio seed:

```bash
cd /var/www/transport/transport
npm run seed
```

To je bitno jer seed ubacuje border crossing zone-ove u bazu.

Ako si seed već pokrenuo na toj bazi, ovaj korak ne treba ponavljati bez razloga.

## 2. Schengen GeoJSON fajl

Provjeri da fajl postoji na serveru:

```bash
cd /var/www/transport/transport
ls -lh data/schengen.geojson
```

U `.env` mora biti:

```env
SCHENGEN_GEOJSON_PATH=./data/schengen.geojson
```

Ako fajl ne postoji, Schengen logika neće raditi.

## 3. BiH GeoJSON fajl

Provjeri da fajl postoji:

```bash
cd /var/www/transport/transport
ls -lh data/bih.geojson
```

U `.env` mora biti:

```env
BIH_GEOJSON_PATH=./data/bih.geojson
```

Ako koristiš Bosnia polygon logiku, ovaj fajl je obavezan.

## 4. Restart aplikacije nakon `.env` ili GeoJSON izmjena

Ako si mijenjao `.env` ili dodavao GeoJSON fajlove:

```bash
cd /var/www/transport/transport
pm2 restart ecosystem.config.js --update-env
pm2 save
```

## 5. Provjera da su border crossing zone-ovi u bazi

Ako želiš brzu provjeru kroz aplikaciju:
- otvori live map / Schengen related dijelove
- provjeri da postoje border crossing događaji i zone

Ako želiš SQL provjeru:

```sql
SELECT id, name, type, "isActive"
FROM "Zone"
WHERE type = 'BORDER_CROSSING'
ORDER BY name;
```

## 6. Provjera Schengen summary ekrana

Otvori:

```text
/schengen
```

Provjeri:
- da se vozači učitavaju
- da imaju `usedDays` i `remainingDays`
- da su poredani po najmanjem broju preostalih dana

## 7. Provjera jednog vozača

Na detalju vozača provjeri:
- Schengen statistiku
- border crossing događaje
- eventualni manual override ako koristiš ručni unos

## 8. Ako Schengen ne radi

Provjeri redom:

1. da li postoji `data/schengen.geojson`
2. da li postoji `data/bih.geojson`
3. da li su `SCHENGEN_GEOJSON_PATH` i `BIH_GEOJSON_PATH` tačni u `.env`
4. da li je app restartovan nakon izmjene `.env`
5. da li postoje `Position` podaci za vozača
6. da li je seed ubacio border crossing zone-ove

## 9. Preporučena operativna komanda

Ako želiš sve osnovno provjeriti odmah:

```bash
cd /var/www/transport/transport
ls -lh data/schengen.geojson
ls -lh data/bih.geojson
pm2 status
```

## 10. Zaključak

Za Schengen nije potreban poseban import u bazu za GeoJSON fajlove.

Potrebno je:
- seed za border crossing zone-ove
- prisustvo `schengen.geojson` fajla
- prisustvo `bih.geojson` fajla ako koristiš Bosnia polygon logiku
- ispravne `.env` putanje
