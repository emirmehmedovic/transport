# 🚀 KOMPLETAN DEPLOYMENT PLAN - Transport Management System

## 📋 PREGLED PROJEKTA

**Production topologija za ovaj projekat:**
- jedan VM/server
- Next.js aplikacija na istom VM-u
- PostgreSQL baza na istom VM-u
- OSRM servis na istom VM-u

To znači da planiranje resursa treba raditi za objedinjeno opterećenje aplikacije, baze i routing servisa.

**Tehnologije:**
- Next.js 14 (Frontend + Backend API)
- PostgreSQL
- Prisma ORM (32 modela)
- React Native (Expo) - Mobile app
- OSRM - Routing engine
- Leaflet - Mapiranje
- Expo Push Notifications
- Telegram Bot

**Statistika:**
- 116+ API endpoints
- 23 database migracije
- 40+ utility biblioteke
- 16 predefinisanih graničnih prelaza
- Schengen polygon (1+ MB GeoJSON)

---

## 🔧 FAZA 1: PRIPREMA I PREREQUISITES

### 1.1 Server Requirements

**Minimalni zahtjevi:**
```
CPU: 2 cores
RAM: 4GB (8GB preporučeno)
Disk: 20GB SSD
OS: Ubuntu 20.04/22.04 LTS ili Debian 11+
Node.js: 18.x ili 20.x
PostgreSQL: 14+
```

**Za OSRM dodatno:**
```
RAM: +4GB (ukupno 8GB minimum)
Disk: +10GB za West Balkan mapu
```

**Preporuka za jedan zajednički VM gdje su aplikacija + PostgreSQL + OSRM:**
```
CPU: 4 cores minimum
RAM: 8GB minimum, 12-16GB preporučeno
Disk: 60GB SSD minimum
```

### 1.2 Potrebni Nalozi i Ključevi

**1. PostgreSQL Database**
```bash
# Baza će biti hostana na istom VM-u kao aplikacija i OSRM
# Kreiraj production bazu i korisnika
```

**2. Telegram Bot**
```bash
# Otvori Telegram i kontaktiraj @BotFather
/newbot
# Prati upustva i dobij BOT_TOKEN

# Dobij svoj CHAT_ID
# Kontaktiraj @userinfobot i dobij svoj numeric ID
```

**3. Expo Account (za mobile push)**
```
Registracija: https://expo.dev
Kreiraj projekat ili koristi postojeći
```

**4. Vercel Account (opciono, samo za test/staging)**
```
Vercel može poslužiti za privremeni staging/test deploy.
Za ovaj projekat production treba tretirati kao self-hosted setup.
```

---

## 🗄️ FAZA 2: DATABASE SETUP

### 2.1 Kreiranje Production Database

**Na istom VM-u (lokalni PostgreSQL):**
```sql
CREATE DATABASE transport_production;
CREATE USER transport_user WITH ENCRYPTED PASSWORD 'PROMIJENI_OVO';
GRANT ALL PRIVILEGES ON DATABASE transport_production TO transport_user;

postgresql://transport_user:PASSWORD@127.0.0.1:5432/transport_production
```

### 2.2 Primjena Migracija

```bash
cd /path/to/transport

# Set database URL
export DATABASE_URL="postgresql://..."

# Generate Prisma Client
npx prisma generate

# Deploy all migrations (23 total)
npx prisma migrate deploy

# Verify migrations
npx prisma migrate status
```

**Migracije koje će se primijeniti:**
```
✅ 20251219221000_init
✅ 20251220211000_add_schengen_tracking
✅ 20251224211000_add_zones_geofence_events
✅ 20251226211000_add_incidents_claims
✅ 20260116211000_add_load_checklist_and_cargo_items
✅ 20260119211000_add_invoices
✅ 20260123211000_add_vacation_periods
✅ 20260125211000_add_client_notifications
✅ 20260126211000_add_toll_permits
✅ 20260219203000_add_load_distance_source
✅ 20260219211000_extend_client_notification_types
✅ 20260430093000_add_mobile_push_and_app_notifications
✅ 20260430160000_add_app_notification_confirmations
✅ 20260430183000_add_app_notification_read_status
✅ 20260501093000_add_load_checklist_and_exceptions
✅ 20260501113000_add_document_approval_workflow
✅ 20260501124500_add_trailer_type_and_capacity_fields
✅ 20260510122527_add_manager_role
✅ 20260510130350_optimize_position_indexes
✅ 20260510134713_add_landmarks
✅ 20260510173641_add_landmark_to_audit_entity
✅ 20260510184125_add_weekly_route_plans
✅ (plus any new migrations)
```

### 2.3 Seed Initial Data

```bash
# Seed database with:
# - Initial admin user (emir.m@live.com)
# - 16 border crossing zones
#
# IMPORTANT:
# - Password is NOT hardcoded in the seed script
# - You must provide it through INITIAL_ADMIN_PASSWORD
INITIAL_ADMIN_PASSWORD='PROMIJENI_OVO_U_JAKU_LOZINKU' npm run seed
```

**Rezultat seed-a:**
```
✅ 1 initial admin korisnik (emir.m@live.com)
✅ 16 graničnih prelaza (Zone model)
✅ Lozinka sačuvana kao bcrypt hash
```

**Sigurnosna napomena:**
- `prisma/seed.ts` više ne kreira demo `dispatcher` i `driver` naloge
- plain-text lozinka se ne čuva u kodu niti u bazi
- nakon prvog logina promijeni seed lozinku na onu koju ćeš stvarno koristiti operativno

---

## 🗺️ FAZA 3: OSRM SETUP (Routing Engine)

**Važna napomena za ovaj projekat:**
- trenutna skripta `scripts/setup-osrm-west-balkan.sh` koristi Docker za OSRM preprocessing
- i najjednostavniji documented način za `osrm-routed` u ovom projektu je Docker
- ako želiš potpuno bez Dockera, trebaš zasebno instalirati native `osrm-backend` binarije i napraviti `systemd` servis za `osrm-routed`
- taj native no-Docker OSRM setup trenutno nije detaljno razrađen u ovom guide-u

Ako želiš native OSRM proces pod PM2, u repou sada postoji primjer:
- [ecosystem.osrm.example.config.js](/Users/emir_mw/transport/ecosystem.osrm.example.config.js)

### 3.1 Preuzimanje OSM Podataka

**Skripta:** `/scripts/setup-osrm-west-balkan.sh`

```bash
cd /path/to/transport/scripts
chmod +x setup-osrm-west-balkan.sh

# Ova skripta će:
# 1. Kreirati data direktorijum
# 2. Preuzeti OSM podatke za BiH, Croatia, Serbia, Slovenia
# 3. Mergovat ih u jedan fajl
# 4. Pokrenuti OSRM pipeline
./setup-osrm-west-balkan.sh
```

**Manuelni setup (ako skripta ne radi):**

```bash
# 1. Kreiraj data folder
mkdir -p ~/osrm-data
cd ~/osrm-data

# 2. Preuzmi OSM podatke
wget https://download.geofabrik.de/europe/bosnia-herzegovina-latest.osm.pbf
wget https://download.geofabrik.de/europe/croatia-latest.osm.pbf
wget https://download.geofabrik.de/europe/serbia-latest.osm.pbf
wget https://download.geofabrik.de/europe/slovenia-latest.osm.pbf

# 3. Merge fajlove (zahtijeva osmium-tool)
sudo apt-get install osmium-tool
osmium merge bosnia-herzegovina-latest.osm.pbf \
               croatia-latest.osm.pbf \
               serbia-latest.osm.pbf \
               slovenia-latest.osm.pbf \
               -o west-balkan.osm.pbf

# 4. Pull OSRM Docker image
docker pull ghcr.io/project-osrm/osrm-backend:latest

# 5. Extract routing data
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/west-balkan.osm.pbf || echo "Exit code $?"

# 6. Partition graph
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-partition /data/west-balkan.osrm || echo "Exit code $?"

# 7. Customize for car profile
docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-customize /data/west-balkan.osrm || echo "Exit code $?"
```

### 3.2 Pokretanje OSRM Servera

**Docker način (preporučeno):**

```bash
# Run OSRM server on port 5000
docker run -t -i -p 5000:5000 \
  -v "${PWD}:/data" \
  --name osrm-west-balkan \
  --restart unless-stopped \
  ghcr.io/project-osrm/osrm-backend \
  osrm-routed --algorithm mld /data/west-balkan.osrm

# Test routing
curl "http://localhost:5000/route/v1/driving/18.4131,43.8564;16.4333,43.5119?overview=full"
```

**PM2 način (ako Docker nije opcija):**

Možeš privremeno koristiti javni OSRM endpoint:
```env
OSRM_BASE_URL=https://router.project-osrm.org
```

**Napomena:** Javni OSRM ima rate limite i nije dobar production izbor. Za production obavezno koristi vlastiti OSRM servis na serveru ili kao zaseban servis na istoj infrastrukturi.

Ako danas ideš potpuno bez Dockera, ova sekcija još nije dovoljna za OSRM. U tom slučaju prije deploya trebaš imati:
- instalirane native `osrm-backend` binarije
- odrađen preprocessing nad `.osm.pbf` fajlom
- `systemd` servis za `osrm-routed`

Za web aplikaciju, PM2 i PostgreSQL guide je spreman. Za native no-Docker OSRM treba dodatno razraditi poseban deployment korak.

### 3.2.A Native OSRM + PM2

Ovo je preporučeni smjer ako želiš OSRM bez Dockera, ali i dalje želiš jednostavan proces management preko PM2.

Prema službenom OSRM `osrm-backend` README-u, Linux build from source ide ovim putem:

```bash
sudo apt install build-essential git cmake ninja-build pkg-config \
  autoconf automake libtool curl zip unzip tar

git clone https://github.com/microsoft/vcpkg.git ~/vcpkg
~/vcpkg/bootstrap-vcpkg.sh
export VCPKG_ROOT=~/vcpkg
```

Zatim kloniraj OSRM source:

```bash
cd /opt
sudo git clone https://github.com/Project-OSRM/osrm-backend.git
sudo chown -R $USER:$USER /opt/osrm-backend
cd /opt/osrm-backend
```

Build i install binarija:

```bash
cmake --preset ci-linux
cmake --build --preset ci-linux
sudo cmake --install build
```

To po službenom README-u instalira OSRM binarije, uključujući `osrm-extract`, `osrm-partition`, `osrm-customize` i `osrm-routed`.

Predloženi layout na VM-u:

```text
/opt/osrm-backend        # source checkout i profiles/car.lua
/opt/osrm/data           # country .osm.pbf fajlovi
/opt/osrm/build          # merged .osm.pbf i .osrm* output
```

Primjer native preprocessing bez Dockera:

```bash
mkdir -p /opt/osrm/data /opt/osrm/build
cd /opt/osrm/build

osmium merge \
  /opt/osrm/data/bosnia-herzegovina-latest.osm.pbf \
  /opt/osrm/data/croatia-latest.osm.pbf \
  /opt/osrm/data/serbia-latest.osm.pbf \
  /opt/osrm/data/slovenia-latest.osm.pbf \
  -o /opt/osrm/build/west-balkan-core.osm.pbf \
  --overwrite

osrm-extract -p /opt/osrm-backend/profiles/car.lua /opt/osrm/build/west-balkan-core.osm.pbf
osrm-partition /opt/osrm/build/west-balkan-core.osrm
osrm-customize /opt/osrm/build/west-balkan-core.osrm
```

PM2 primjer:

```bash
cp /var/www/transport/ecosystem.osrm.example.config.js /opt/osrm/ecosystem.osrm.config.js
pm2 start /opt/osrm/ecosystem.osrm.config.js
pm2 save
```

Sadržaj primjera je već pripremljen u:
- [ecosystem.osrm.example.config.js](/Users/emir_mw/transport/ecosystem.osrm.example.config.js)

Taj primjer pretpostavlja:
- `osrm-routed` instaliran u `/usr/local/bin/osrm-routed`
- dataset baza u `/opt/osrm/build/west-balkan-core.osrm`

Test nakon starta:

```bash
curl "http://127.0.0.1:5000/route/v1/driving/18.4131,43.8564;16.4333,43.5119?steps=true"
```

Ako to radi, u aplikaciji koristi:

```env
OSRM_BASE_URL=http://127.0.0.1:5000
```

### 3.3 Verifikacija OSRM-a

```bash
# Test route Sarajevo -> Split
curl "http://localhost:5000/route/v1/driving/18.4131,43.8564;16.4333,43.5119?overview=false"

# Očekivani output:
# {"code":"Ok","routes":[{"distance":...,"duration":...}]}
```

---

## 🌍 FAZA 4: GEOSPATIAL DATA IMPORT

### 4.1 Schengen GeoJSON

**Fajl:** `/data/schengen.geojson` (1.2 MB)

Fajl već postoji u projektu. Samo provjeri putanju:

```bash
ls -lh /path/to/transport/data/schengen.geojson

# Ako fali, možeš ga regenerisati:
cd /path/to/transport/scripts
python3 build-schengen-geojson.py
```

**Environment variable:**
```env
SCHENGEN_GEOJSON_PATH=./data/schengen.geojson
```

### 4.2 Bosnia Polygon GeoJSON

**Fajl:** `/data/bih.geojson`

Ovaj fajl nije dio repozitorija i mora postojati ako želiš da Bosnia polygon logika radi ispravno.

```bash
ls -lh /path/to/transport/data/bih.geojson
```

Ako fajl ne postoji:
- dodaj validan Bosnia-Herzegovina GeoJSON polygon u `data/bih.geojson`
- ili privremeno isključi ovu logiku dok fajl ne pripremiš

**Environment variable:**
```env
BIH_GEOJSON_PATH=./data/bih.geojson
```

### 4.3 Border Crossings (Granični Prelazi)

**Fajl:** `/data/border-crossings.ts`

16 graničnih prelaza BiH-Hrvatska su već definirani:

```typescript
// Automatski se seeduju u database
// Lokacije:
1. Gradiška (N 45.1433, E 17.2503)
2. Bosanska Gradiška (N 45.1417, E 17.2519)
3. Novi Grad (N 45.0492, E 16.3856)
4. Bosanski Novi (N 44.9753, E 16.3961)
5. Bosanska Kostajnica (N 45.2239, E 16.5428)
6. Bosanska Krupa (N 44.8844, E 15.9967)
... (11 more)
```

Nema dodatnih akcija - seed skripta automatski importuje.

### 4.4 Landmarks Import (Opciono)

Ako imaš dodatne landmarks (benzinske, terminale, luke):

```bash
# Kreiraj CSV fajl: landmarks.csv
# Format:
# name,type,address,city,country,latitude,longitude,radius

# Kreiraj import skriptu
node scripts/import-landmarks.js
```

**Primjer landmark CSV:**
```csv
"INA Sarajevo","FUEL_STATION","Zmaja od Bosne 88","Sarajevo","BiH",43.8563,18.4131,200
"Lukavac Terminal","TERMINAL","Industrijska zona","Lukavac","BiH",44.5422,18.5281,500
"Ploče Luka","PORT","Luka Ploče","Ploče","Croatia",43.0572,17.4314,1000
```

---

## ⚙️ FAZA 5: ENVIRONMENT CONFIGURATION

### 5.1 Production `.env` File

**Kreirati:** `/path/to/transport/.env`

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://transport_user:YOUR_PASSWORD@127.0.0.1:5432/transport_production

# ============================================
# JWT SECRETS (OBAVEZNO PROMIJENITI!)
# ============================================
JWT_SECRET=PROMIJENITI-U-SUPER-DUGI-RANDOM-STRING-MIN-64-CHARS
JWT_REFRESH_SECRET=PROMIJENITI-U-DRUGI-SUPER-DUGI-RANDOM-STRING-MIN-64-CHARS

# Generate JWT secrets:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ============================================
# TELEGRAM BOT
# ============================================
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
TELEGRAM_ADMIN_CHAT_ID=YOUR_NUMERIC_CHAT_ID

# ============================================
# EMAIL REPORTS
# ============================================
MAIL_FROM=transport@tvoja-domena.com
SMTP_HOST=smtp.tvoj-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tvoj-smtp-user
SMTP_PASS=tvoja-smtp-lozinka
# Optional:
# SMTP_REQUIRE_TLS=true
# SMTP_ALLOW_SELF_SIGNED=false

# ============================================
# FILE UPLOAD
# ============================================
# Aplikacija trenutno koristi lokalni folder ./uploads
# UPLOAD_DIR nije aktivna runtime varijabla u trenutnoj implementaciji
MAX_FILE_SIZE=10485760

# ============================================
# APPLICATION
# ============================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tvoja-domena.com
NEXT_PUBLIC_API_URL=https://tvoja-domena.com

# ============================================
# ROUTING & GPS
# ============================================
OSRM_BASE_URL=http://127.0.0.1:5000
# Ili koristi javni: https://router.project-osrm.org

SCHENGEN_GEOJSON_PATH=./data/schengen.geojson
BIH_GEOJSON_PATH=./data/bih.geojson

# ============================================
# TELEMETRY & CRON
# ============================================
TELEMETRY_SHARED_KEY=PROMIJENITI-U-RANDOM-STRING
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

CRON_SECRET=PROMIJENITI-U-RANDOM-STRING
CRON_RUN_IMMEDIATE=false

# ============================================
# OPTIONAL: NTS GPS (ako koristite)
# ============================================
# NTS_API_URL=https://your-nts-endpoint
# NTS_SERVER=your-server
# NTS_AUTH_TOKEN=your-token
# NTS_AUTH_COOKIE=your-cookie
```

### 5.2 Kreiranje Secrets (za production)

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output za JWT_SECRET

# Generate refresh secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output za JWT_REFRESH_SECRET

# Generate telemetry key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output za TELEMETRY_SHARED_KEY

# Generate cron secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output za CRON_SECRET
```

---

## 🚀 FAZA 6: APPLICATION DEPLOYMENT

### Primarni model: Self-Hosted (firmin server / private VPS / dedicated)

Ovaj projekat u production okruženju treba tretirati kao self-hosted aplikaciju zbog:
- lokalnog `uploads` storage-a
- vlastitog OSRM servisa
- GeoJSON fajlova sa diska
- cron procesa koji su sastavni dio sistema

Vercel može ostati samo kao staging/test opcija ako želiš brzo validirati web dio, ali nije preporučen kao glavni production deployment za ovu arhitekturu.

U ovom konkretnom deploymentu pretpostavka je:
- aplikacija, PostgreSQL i OSRM rade na istom VM-u
- koristi se lokalni `localhost` network između servisa gdje god je moguće
- treba paziti na RAM i disk jer OSRM i PostgreSQL dijele iste resurse

**1. Prepare Server**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Git
sudo apt-get install -y git

# Install Nginx (reverse proxy)
sudo apt-get install -y nginx

# Install Docker (only ako OSRM ostaje na Docker modelu)
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER

# Optional but recommended for OSM merge
sudo apt-get install -y osmium-tool

# Security hardening basics
sudo apt-get install -y fail2ban ufw unattended-upgrades

```

**2. Clone Repository**

```bash
# Create app directory
sudo mkdir -p /var/www/transport
sudo chown $USER:$USER /var/www/transport

# Clone repo
cd /var/www/transport
git clone https://github.com/your-repo/transport.git .

# Install dependencies
npm install

# Build production
npm run build
```

**2.1 PostgreSQL on the same VM**

Ako baza radi na istom VM-u, preporuka je:
- PostgreSQL da sluša samo na `127.0.0.1`
- aplikacija da pristupa bazi preko lokalnog `DATABASE_URL`
- ne otvarati port `5432` prema internetu

**2.2 SMTP delivery for weekly reports**

Sedmični Schengen izvještaj sada se šalje preko vanjskog SMTP providera direktno iz aplikacije.

Obavezni env:
- `MAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

Ako provider traži STARTTLS na `587`, tipično koristiš:

```env
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
```

Ako provider traži implicit TLS na `465`, tipično koristiš:

```env
SMTP_PORT=465
SMTP_SECURE=true
```

**3. Create Uploads Directory**

```bash
mkdir -p /var/www/transport/uploads
chmod 755 /var/www/transport/uploads
```

**4. PM2 Configuration**

Repo već sadrži PM2 config:

- [ecosystem.config.js](/Users/emir_mw/transport/ecosystem.config.js)

Na VM-u ga ne trebaš ručno pisati, samo ga koristiš nakon kloniranja repoa.

```javascript
module.exports = {
  apps: [
    {
      name: "transport-app",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 2,
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      time: true
    },
    {
      name: "transport-cron",
      script: "npm",
      args: "run cron:start",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      time: true
    }
  ]
};
```

`transport-cron` pokreće interni scheduler iz `scripts/cron-runner.ts`, pa iste recurring/notification poslove ne treba dodatno stavljati u system `crontab`.

**5. Start Application**

```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
# Copy and run the command PM2 prints

# Check status
pm2 status
pm2 logs transport-app
```

**6. Nginx Reverse Proxy**

**Kreirati:** `/etc/nginx/sites-available/transport`

```nginx
server {
    listen 80;
    server_name tvoja-domena.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tvoja-domena.com;

    # SSL certificates (use Certbot)
    ssl_certificate /etc/letsencrypt/live/tvoja-domena.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tvoja-domena.com/privkey.pem;

    # File upload size
    client_max_body_size 10M;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads directory
    location /uploads {
        alias /var/www/transport/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**7. Enable Site & SSL**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/transport /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d tvoja-domena.com

# Reload Nginx
sudo systemctl reload nginx
```

**8. Setup Cron Jobs**

```bash
# Edit crontab
crontab -e

# Add only this line:
# Generate route plan loads daily at 6 AM
0 6 * * * curl -s -X GET "http://localhost:3000/api/cron/generate-route-plan-loads" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/transport-route-plan-cron.log 2>&1
```

**Važno:**
- `recurring loads` i `notifications` već pokriva `transport-cron` PM2 proces
- nemoj iste poslove dodatno stavljati u `crontab`, jer ćeš dobiti duplo izvršavanje
- jedini API cron koji se trenutno poziva spolja je `generate-route-plan-loads`

---

## 📱 FAZA 7: MOBILE APP DEPLOYMENT

### 7.1 Update Mobile Configuration

**Edit:** `/mobile/.env`

```env
EXPO_PUBLIC_API_BASE_URL=https://tvoja-domena.com
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

`EXPO_PUBLIC_EAS_PROJECT_ID` je bitan za stabilnu Expo push registraciju u production buildovima. Nemoj ga preskočiti.

### 7.2 Build APK

```bash
cd /path/to/transport/mobile

# Install dependencies
npm install

# Login to Expo
npx expo login

# Build production APK
eas build --platform android --profile production

# Or preview build
eas build --platform android --profile preview
```

**EAS Build Profiles** (već konfigurisano u `eas.json`):

```json
{
  "build": {
    "development": {
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 7.3 Distribucija APK-a

**Opcije:**

1. **Direktna distribucija:**
   - Download APK sa EAS Build dashboard
   - Pošalji vozačima preko WhatsApp/Email
   - Instalacija: Settings → Security → Unknown Sources → Enable

2. **Google Play Internal Testing:**
   - Build AAB umjesto APK
   - Upload na Google Play Console
   - Dodaj test korisnike

3. **Firebase App Distribution:**
   - Upload APK na Firebase
   - Pošalji invite linkove

### 7.4 Push Notifications Setup

**U mobile app:**

1. Korisnici se automatski registruju za notifikacije na login
2. Push token se šalje na `/api/mobile-push/register`
3. Backend validira token format
4. Notifikacije se šalju preko Expo Push Service

**Test notifikacije:**

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "title": "Test Notifikacija",
    "body": "Transport app je spreman!",
    "data": {
      "type": "test"
    }
  }'
```

---

## ✅ FAZA 8: POST-DEPLOYMENT VERIFICATION

### 8.1 Smoke Tests

**1. Test Autentifikaciju:**

```bash
# Login test
curl -X POST https://tvoja-domena.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "emir.m@live.com",
    "password": "INITIAL_ADMIN_PASSWORD_vrijednost_koju_si_postavio"
  }'

# Očekivani output:
# {"user":{...},"token":"...","refreshToken":"..."}
```

**2. Test Load Creation:**

```bash
# Create test load
curl -X POST https://tvoja-domena.com/api/loads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "loadNumber": "TEST-001",
    "pickupCity": "Sarajevo",
    "deliveryCity": "Zagreb",
    "status": "AVAILABLE"
  }'
```

**3. Test OSRM Routing:**

```bash
# Test routing endpoint
curl "https://tvoja-domena.com/api/routing/osrm?origin=18.4131,43.8564&destination=16.4333,43.5119"

# Očekivani output:
# {"route":{...},"distance":...,"duration":...}
```

**4. Test Telegram Bot:**

```bash
# Telegram test se izvršava automatski pri startup-u
# Provjeri logs:
pm2 logs transport-app | grep "Telegram"

# Ili pošalji test poruku:
curl -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
  -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
  -d "text=Transport app deployment uspješan!"
```

**5. Test Cron Jobs:**

```bash
# Manual test route plan loads
curl -X GET "https://tvoja-domena.com/api/cron/generate-route-plan-loads" \
  -H "Authorization: Bearer $CRON_SECRET"

# Manual test internal cron runner
cd /var/www/transport
npm run cron:start
```

### 8.2 Functional Tests

**Web Dashboard:**
- [ ] Login sa admin korisnikom
- [ ] Kreiraj novi load
- [ ] Dodijeli load vozaču
- [ ] Provjeri live map
- [ ] Upload dokument
- [ ] Kreiraj route plan
- [ ] Test filters i search

**Mobile App:**
- [ ] Login sa driver korisnikom
- [ ] Vidi assigned load
- [ ] Update load status
- [ ] Upload POD dokument
- [ ] Provjeri GPS tracking
- [ ] Test notifikacije

### 8.3 Performance Tests

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s "https://tvoja-domena.com/api/loads"

# curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

### 8.4 Security Checklist

- [ ] JWT secrets promijenjeni
- [ ] PostgreSQL dostupan samo lokalno na `127.0.0.1`
- [ ] HTTPS certifikat aktivan
- [ ] Rate limiting radi
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] File upload restrictions active
- [ ] Backup strategy defined

### 8.5 VM Hardening i Security

**OS hardening minimum:**

```bash
# Enable firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Enable automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Start and enable fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

**SSH hardening preporuka:**
- koristi SSH key login
- isključi password login ako je moguće
- promijeni ili strogo ograniči root SSH pristup
- po mogućnosti koristi poseban admin user sa `sudo`

Primjer bitnih `sshd_config` postavki:

```conf
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 5
```

Nakon izmjene:

```bash
sudo systemctl restart ssh
```

**Fail2ban minimum jail:**

**Kreirati:** `/etc/fail2ban/jail.local`

```ini
[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
maxretry = 5
bantime = 1h
findtime = 10m
```

Zatim:

```bash
sudo systemctl restart fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

**PostgreSQL hardening:**
- `listen_addresses = '127.0.0.1'`
- u `pg_hba.conf` dozvoli samo lokalne konekcije za aplikacijskog usera
- ne otvarati `5432` javno ako baza ostaje na istom VM-u

Primjer:

```conf
# postgresql.conf
listen_addresses = '127.0.0.1'
```

```conf
# pg_hba.conf
local   all             all                                     scram-sha-256
host    transport_production   transport_user   127.0.0.1/32   scram-sha-256
```

**Nginx hardening preporuka:**
- sakrij Nginx verziju
- ograniči request burst na login/API rutama
- ostavi samo `80/443` javno otvorene
- ako imaš vanjski firewall, host firewall i dalje zadrži kao drugi sloj zaštite

Primjer dodatka u `nginx.conf`:

```nginx
server_tokens off;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
```

Primjer na osjetljivim rutama:

```nginx
location /api/auth/login {
    limit_req zone=login_limit burst=10 nodelay;
    proxy_pass http://localhost:3000;
}

location /api/ {
    limit_req zone=api_limit burst=30 nodelay;
    proxy_pass http://localhost:3000;
}
```

**File system i procesi:**
- aplikaciju pokrenuti pod ne-root korisnikom
- `.env` držati sa dozvolama `600`
- `uploads` folder ne smije biti writable svima
- PM2 procese pokretati pod aplikacijskim userom, ne pod root-om

Primjer:

```bash
chmod 600 /var/www/transport/.env
chmod 755 /var/www/transport/uploads
chown -R appuser:appuser /var/www/transport
```

**Dodatno preporučeno prije go-live:**
- `npm audit` pregledati i procijeniti kritične nalaze
- osigurati `logrotate` za PM2/Nginx logove
- testirati restore iz backup-a, ne samo backup kreiranje
- Telegram alerting ostaviti aktivan za health-check i disk usage

---

## 📊 FAZA 9: MONITORING & MAINTENANCE

### 9.1 Log Monitoring

**PM2 Logs:**

```bash
# Real-time logs
pm2 logs transport-app

# Error logs only
pm2 logs transport-app --err

# Logs sa timestamps
pm2 logs transport-app --timestamp

# Save logs to file
pm2 logs transport-app --lines 1000 > transport-logs.txt
```

**Nginx Logs:**

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log

# Filter by IP
sudo tail -f /var/log/nginx/access.log | grep "1.2.3.4"
```

**Application Logs:**

```bash
# Cron logs
pm2 logs transport-cron
tail -f /var/log/transport-route-plan-cron.log
```

### 9.2 Database Monitoring

```bash
# Connection count
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Slow queries
psql $DATABASE_URL -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# Database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"
```

### 9.3 Backup Strategy

**Database Backup (lokalni PostgreSQL na istom VM-u):**

```bash
# Manual backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Automated daily backup (cron)
0 2 * * * pg_dump $DATABASE_URL > /backups/transport-$(date +\%Y\%m\%d).sql 2>&1
```

**Application Files Backup:**

```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz /var/www/transport/uploads/

# Backup .env
cp /var/www/transport/.env /secure/location/.env.backup
```

### 9.4 Update Procedure

```bash
cd /var/www/transport

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Run migrations
npx prisma migrate deploy

# 4. Build
npm run build

# 5. Restart PM2
pm2 restart ecosystem.config.js

# 6. Check logs
pm2 logs transport-app --lines 50
```

### 9.5 Health Checks

**Kreirati:** `/var/www/transport/scripts/health-check.sh`

```bash
#!/bin/bash

# Check if app is running
if ! pm2 list | grep -q "transport-app.*online"; then
    echo "❌ App is not running!"
    pm2 restart transport-app
    curl -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
      -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
      -d "text=🚨 Transport app was down and has been restarted!"
else
    echo "✅ App is running"
fi

# Check HTTP liveness
if ! curl -fsS "http://localhost:3000/" > /dev/null; then
    echo "❌ Application HTTP check failed!"
    curl -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
      -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
      -d "text=🚨 Transport app HTTP check failed!"
else
    echo "✅ Application HTTP endpoint is accessible"
fi

# Check database connectivity through Prisma
if ! cd /var/www/transport && npx prisma migrate status >/dev/null 2>&1; then
    echo "⚠️  Prisma/database check failed!"
    curl -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
      -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
      -d "text=⚠️ Prisma/database check failed on transport server!"
else
    echo "✅ Prisma/database check passed"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "⚠️  Disk usage is at ${DISK_USAGE}%"
    curl -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
      -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
      -d "text=⚠️ Disk usage is at ${DISK_USAGE}%"
fi
```

**Setup Health Check Cron:**

```bash
chmod +x /var/www/transport/scripts/health-check.sh

# Add to crontab (every 5 minutes)
*/5 * * * * /var/www/transport/scripts/health-check.sh >> /var/log/health-check.log 2>&1
```

---

## 🎯 DEPLOYMENT CHECKLIST - FINAL

### Pre-Deployment
- [ ] Code review completed
- [ ] All tests passing
- [ ] Environment variables documented
- [ ] Database backup created
- [ ] Rollback plan documented

### Infrastructure
- [ ] Server provisioned (CPU/RAM adequate)
- [ ] Domain DNS configured
- [ ] SSL certificate obtained
- [ ] Firewall rules configured (22, 80, 443)
- [ ] Monitoring tools installed

### Database
- [ ] Production database created
- [ ] Connection string secured
- [ ] Migrations applied (23 total)
- [ ] Seed data imported
- [ ] Indexes verified
- [ ] Backup strategy active

### OSRM
- [ ] Docker installed
- [ ] OSM data downloaded (BiH, Croatia, Serbia, Slovenia)
- [ ] Data merged and processed
- [ ] OSRM container running on port 5000
- [ ] Routing endpoints tested

### Application
- [ ] Dependencies installed
- [ ] Production build completed
- [ ] Environment variables set (all 20+)
- [ ] JWT secrets generated and secure
- [ ] Uploads directory created
- [ ] PM2 configured
- [ ] Reverse proxy configured (Nginx)
- [ ] SSL/HTTPS active

### External Services
- [ ] Telegram bot configured and tested
- [ ] Expo push tokens working
- [ ] OSRM responding to queries
- [ ] Geocoding API accessible

### Data
- [ ] Border crossings seeded (16 total)
- [ ] Schengen polygon loaded
- [ ] Bosnia polygon file prepared (`data/bih.geojson`) if Bosnia detection is used
- [ ] Test users created
- [ ] Landmarks imported (if applicable)

### Cron Jobs
- [ ] Recurring loads generator active through `transport-cron`
- [ ] Route plan loads generator scheduled
- [ ] Notification runner active through `transport-cron`
- [ ] Health checks scheduled

### Mobile App
- [ ] API URL configured
- [ ] APK built and signed
- [ ] Push notifications working
- [ ] Distributed to drivers

### Testing
- [ ] Smoke tests passed
- [ ] Authentication working
- [ ] Load creation working
- [ ] Routing working
- [ ] Mobile app connected
- [ ] Push notifications delivered
- [ ] Document upload working
- [ ] GPS tracking functional

### Monitoring
- [ ] PM2 monitoring active
- [ ] Log rotation configured
- [ ] Disk space monitoring
- [ ] Database monitoring
- [ ] Error alerting via Telegram

### Documentation
- [ ] Deployment guide updated
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide created
- [ ] User manual prepared

---

## 📞 SUPPORT & TROUBLESHOOTING

### Česti Problemi

**Problem 1: Database connection fails**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check if migrations are applied
npx prisma migrate status
```

**Problem 2: OSRM not responding**
```bash
# Check if container is running
docker ps | grep osrm

# Restart container
docker restart osrm-west-balkan

# Check logs
docker logs osrm-west-balkan
```

**Problem 3: Push notifications not working**
```bash
# Check Expo token format
# Should start with: ExponentPushToken[

# Test manually
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{"to":"ExponentPushToken[xxx]","title":"Test"}'
```

**Problem 4: Cron jobs not running**
```bash
# Check if jobs are scheduled
crontab -l

# Check PM2 scheduler logs
pm2 logs transport-cron --lines 100

# Check cron logs
grep CRON /var/log/syslog

# Run route-plan cron manually
curl -X GET "http://localhost:3000/api/cron/generate-route-plan-loads" \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Problem 5: PM2 app crashed**
```bash
# Check status
pm2 status

# Restart
pm2 restart transport-app

# Check logs for errors
pm2 logs transport-app --err --lines 100
```

---

## 🎉 ZAVRŠETAK

Nakon uspješnog deployment-a, imaćete potpuno funkcionalan transport management system sa:

✅ Web dashboard za admin/dispatcher/vozače
✅ Mobile app za vozače
✅ Real-time GPS tracking
✅ Route planning sa vlastitim OSRM servisom
✅ Schengen 90/180 tracking
✅ Automated notifications (Telegram + Push)
✅ Document management
✅ Weekly route planning
✅ Compliance monitoring
✅ Invoice generation
✅ Reporting & analytics

**Približno vrijeme deployment-a:**
- Setup servera: 1-2h
- Database & migrations: 30min
- OSRM setup: 2-3h (download + processing)
- Application deployment: 1-2h
- Mobile app build: 30min-1h
- Testing & verification: 2-3h

**Ukupno: 8-12 sati** (sa testiranjem)

Za bilo kakva pitanja ili probleme, kontaktiraj development tim.
