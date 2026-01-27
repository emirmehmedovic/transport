Plan integracije Traccar Client u vašu postojeću aplikaciju
1. Šta trebate napraviti (3 koraka, 30 minuta)
Korak 1: Dodajte jedan API endpoint u vašu Next.js/Node.js aplikaciju. Traccar Client šalje podatke na taj URL u OsmAnd formatu.

Korak 2: Kreirajte jednu tabelu u postojećoj Postgres bazi za čuvanje lokacija.

Korak 3: Testirajte sa jednim telefonom vozača, zatim rollout na ostale.

2. Format podataka koji Traccar Client šalje
Traccar Client šalje HTTP GET/POST zahtjev na vaš URL sa ovim parametrima (query string ili POST body):

Parametar	Opis	Primjer
id ili deviceid	Obavezan Device ID koji postavite u aplikaciji	KAMION-01
lat	Latitude (geografska širina)	44.53842
lon	Longitude (geografska dužina)	18.66709
speed	Brzina u km/h	45.2
bearing	Smjer (stupnjevi)	270
altitude	Visina u metrima	250
battery ili batt	Razina baterije u %	85
accuracy	Preciznost u metrima	10
timestamp	Vrijeme (Unix timestamp ili ISO)	1640995200
Primjer zahteva koji dobija vaš server:

text
GET /api/telemetry?id=KAMION-01&lat=44.53842&lon=18.66709&speed=45&battery=85×tamp=1640995200
Odgovor servera: Samo 200 OK (tekst "OK" je dovoljno).

3. API Endpoint (Dodajte u postojeću aplikaciju)
Kreirajte /api/telemetry endpoint koji:

Prima ove parametre

Upisuje ih u bazu

Vraća 200 OK

Šta vaša logika treba raditi:

text
1. Izvuci id, lat, lon iz requesta
2. Ako nema id/lat/lon → 400 Bad Request
3. INSERT u tabelu positions
4. UPDATE last_seen u tabeli trucks
5. Vrati 200 OK
4. Baza podataka (Dodajte 2 tabele)
sql
-- Tabela za kamione (jednom napravi)
CREATE TABLE IF NOT EXISTS trucks (
    device_id VARCHAR(50) PRIMARY KEY,
    truck_plate VARCHAR(20),
    driver_name VARCHAR(100),
    telegram_chat_id BIGINT,
    last_seen TIMESTAMP DEFAULT NOW()
);

-- Tabela za lokacije (jednom napravi)
CREATE TABLE IF NOT EXISTS positions (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES trucks(device_id),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    speed FLOAT DEFAULT 0,
    battery FLOAT DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- Dodaj test kamion
INSERT INTO trucks (device_id, truck_plate, driver_name) 
VALUES ('KAMION-01', 'TZ-123-AB', 'Test Vozač') 
ON CONFLICT (device_id) DO NOTHING;
5. Testiranje (15 minuta)
Korak 1: Testirajte API curl-om

bash
curl "https://vasa-domena.com/api/telemetry?id=KAMION-01&lat=44.53842&lon=18.66709&speed=45"
Provjerite bazu: SELECT * FROM positions ORDER BY id DESC LIMIT 5;

Korak 2: Testirajte sa telefonom

Instalirajte Traccar Client na vaš/test telefon

Postavke:

Server URL: https://vasa-domena.com

Device ID: KAMION-01

Frequency: 300 (5 min)

Pokrenite praćenje, hodajte 10 min

Provjerite bazu – trebate vidjeti nove lokacije

6. Rollout na vozače
Za svakog vozača (5 min):

Dajte mu Device ID (npr. KAMION-XX)

Dodajte u bazu: INSERT INTO trucks (device_id, truck_plate, driver_name) VALUES ('KAMION-XX', '...', '...');

Instalirajte Traccar Client na njegov telefon

Postavite Server URL i Device ID

Android: Isključite Battery Optimization za aplikaciju

Testirajte: Neka vozi 10 min, provjerite podatke

7. Integracija sa Telegram botom
Dodajte cron job (svakih 10 min) koji provjerava:

sql
-- Offline kamioni > 30 min
SELECT * FROM trucks WHERE last_seen < NOW() - INTERVAL '30 minutes';
Za svaki offline kamion pošaljite Telegram poruku:

text
"Kamion TZ-XXX nije vidljiv 30 min! 
[🟢 Restartuj praćenje](traccar://device?deviceId=KAMION-XX)"
8. Podešavanja za stabilnost
Android (obavezno):

Settings → Apps → Traccar Client → Battery → Unrestricted

Autostart: ON (ako postoji)

iOS:

Location Accuracy: Medium (ne High)

Ne dajte vozaču da "swipe up" zatvori app

9. Očekivani rezultati
Preciznost: 5-20m (GPS + WiFi)

Podaci: <5MB/mjesec po kamionu

Baterija: Zanemarivo (1-2% dnevno)

Offline: Čuva podatke, šalje kad ima internet

Spremni ste za produkciju nakon jednog uspješnog testa telefona!

