# 🚀 KOMPLETAN DEPLOYMENT PLAN - Transport Management System

## 📋 PREGLED PROJEKTA

**Tehnologije:**
- Next.js 14 (Frontend + Backend API)
- PostgreSQL (Neon Database)
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

### 1.2 Potrebni Nalozi i Ključevi

**1. Neon Database (PostgreSQL)**
```
Registracija: https://neon.tech
Kreiraj novi projekat: transport-production
Kopiraj connection string
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

**4. Vercel Account (opciono, za cloud deployment)**
```
Registracija: https://vercel.com
Poveži GitHub repository
```

---

## 🗄️ FAZA 2: DATABASE SETUP

### 2.1 Kreiranje Production Database

**Na Neon.tech:**
```sql
-- Neon automatski kreira database
-- Samo kopiraj connection string

postgresql://neondb_owner:PASSWORD@HOST.neon.tech/neondb?sslmode=require&channel_binding=require
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
# - Admin user (admin@transport.com / admin123)
# - Dispatcher (dispatcher@transport.com / dispatcher123)
# - Driver (driver@transport.com / driver123)
# - 16 border crossing zones
npm run seed
```

**Rezultat seed-a:**
```
✅ 3 test korisnika
✅ 16 graničnih prelaza (Zone model)
✅ Osnovne settings
```

---

## 🗺️ FAZA 3: OSRM SETUP (Routing Engine)

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

Možeš koristiti javni OSRM endpoint:
```env
OSRM_BASE_URL=https://router.project-osrm.org
```

**Napomena:** Javni OSRM ima rate limite. Za production obavezno koristi vlastiti server.

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

### 4.2 Border Crossings (Granični Prelazi)

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

### 4.3 Landmarks Import (Opciono)

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
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@YOUR_HOST.neon.tech/neondb?sslmode=require&channel_binding=require

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
# FILE UPLOAD
# ============================================
UPLOAD_DIR=./uploads
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

### Opcija A: Vercel Deployment (Cloud - Preporučeno)

**Prednosti:**
- Automatski deploy on git push
- Serverless (beskonačna skalabilnost)
- Besplatni tier (Hobby plan)
- Automatski SSL
- Cron jobs uključeni

**Setup:**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Link project
cd /path/to/transport
vercel link

# 4. Add environment variables
vercel env add DATABASE_URL
# ... dodaj sve environment variables jedan po jedan

# Ili koristi Vercel dashboard:
# https://vercel.com/your-team/your-project/settings/environment-variables

# 5. Deploy
vercel --prod
```

**Vercel Dashboard Setup:**
1. Importuj GitHub repo
2. Dodaj environment variables
3. Vercel automatski detektuje Next.js
4. Deploy!

**Cron Jobs:**
Već konfigurisan u `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/generate-route-plan-loads",
    "schedule": "0 6 * * *"
  }]
}
```

### Opcija B: Self-Hosted (VPS/Dedicated Server)

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

**3. Create Uploads Directory**

```bash
mkdir -p /var/www/transport/uploads
chmod 755 /var/www/transport/uploads
```

**4. PM2 Configuration**

**Kreirati:** `/var/www/transport/ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'transport-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/transport',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/transport-error.log',
      out_file: '/var/log/pm2/transport-out.log',
      time: true
    },
    {
      name: 'transport-cron',
      script: 'node',
      args: 'scripts/cron-runner.ts',
      cwd: '/var/www/transport',
      instances: 1,
      cron_restart: '0 */6 * * *',
      autorestart: true
    }
  ]
};
```

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

# Add these lines:
# Generate recurring loads daily at midnight
0 0 * * * cd /var/www/transport && node scripts/recurring-runner.ts >> /var/log/transport-recurring.log 2>&1

# Run notifications daily at 6:30 AM
30 6 * * * cd /var/www/transport && node scripts/notification-runner.ts >> /var/log/transport-notifications.log 2>&1

# Generate route plan loads daily at 6 AM
0 6 * * * cd /var/www/transport && curl -X GET "http://localhost:3000/api/cron/generate-route-plan-loads?secret=$CRON_SECRET" >> /var/log/transport-cron.log 2>&1
```

---

## 📱 FAZA 7: MOBILE APP DEPLOYMENT

### 7.1 Update Mobile Configuration

**Edit:** `/mobile/.env`

```env
EXPO_PUBLIC_API_BASE_URL=https://tvoja-domena.com
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

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
    "email": "admin@transport.com",
    "password": "admin123"
  }'

# Očekivani output:
# {"user":{...},"accessToken":"...","refreshToken":"..."}
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
# Manual test recurring loads
curl "https://tvoja-domena.com/api/cron/recurring-loads?secret=$CRON_SECRET"

# Manual test route plan loads
curl "https://tvoja-domena.com/api/cron/generate-route-plan-loads?secret=$CRON_SECRET"
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
- [ ] Database connection preko SSL
- [ ] HTTPS certifikat aktivan
- [ ] Rate limiting radi
- [ ] CORS properly configured
- [ ] No sensitive data in logs
- [ ] File upload restrictions active
- [ ] Backup strategy defined

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
tail -f /var/log/transport-recurring.log
tail -f /var/log/transport-notifications.log
tail -f /var/log/transport-cron.log
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

**Database Backup (Neon ima automatski backup):**

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

# Check database connectivity
if ! curl -s "http://localhost:3000/api/health" | grep -q "ok"; then
    echo "❌ Database connection failed!"
    curl -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
      -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
      -d "text=🚨 Transport app database connection failed!"
else
    echo "✅ Database is accessible"
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
- [ ] Firewall rules configured (80, 443, 5000)
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
- [ ] PM2/Vercel configured
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
- [ ] Test users created
- [ ] Landmarks imported (if applicable)

### Cron Jobs
- [ ] Recurring loads generator scheduled
- [ ] Route plan loads generator scheduled
- [ ] Notification runner scheduled
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

# Check cron logs
grep CRON /var/log/syslog

# Run job manually
curl "http://localhost:3000/api/cron/recurring-loads?secret=$CRON_SECRET"
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
✅ Route planning sa OSRM
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

Za bilo kakva pitanja ili probleme, kontaktiraj development tim! 🚀
