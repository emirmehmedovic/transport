# Production Rollout Checklist

Kratka operativna verzija za stvarni self-hosted deployment na firmin server.

Detaljni vodič: [DEPLOYMENT_GUIDE.md](/Users/emir_mw/transport/docs/DEPLOYMENT_GUIDE.md)

Topologija za ovaj rollout:
- jedan VM
- aplikacija na tom VM-u
- PostgreSQL na tom VM-u
- OSRM na tom VM-u

## 1. Infrastruktura

- [ ] VM dimenzionisan za zajednički rad aplikacije + PostgreSQL + OSRM
- [ ] Server spreman: Ubuntu/Debian, Node.js 20, PM2, Nginx
- [ ] OSRM deployment model definitivno odlučen
- [ ] `osmium-tool` instaliran za merge OSM fajlova
- [ ] DNS usmjeren na server
- [ ] HTTPS/Certbot podešen
- [ ] Firewall otvoren za `80`, `443`

## 2. Aplikacija

- [ ] Repo kloniran u `/var/www/transport`
- [ ] Repo PM2 config postoji: `ecosystem.config.js`
- [ ] `.env` kreiran
- [ ] `npm install` završen
- [ ] `npx prisma generate` završen
- [ ] `npx prisma migrate deploy` završen
- [ ] `npm run build` prolazi
- [ ] `pm2 start ecosystem.config.js`
- [ ] `pm2 save`
- [ ] `pm2 startup`

## 3. Obavezni Env

- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `TELEGRAM_BOT_TOKEN`
- [ ] `TELEGRAM_ADMIN_CHAT_ID`
- [ ] `TELEMETRY_SHARED_KEY`
- [ ] `CRON_SECRET`
- [ ] `OSRM_BASE_URL`
- [ ] `SCHENGEN_GEOJSON_PATH=./data/schengen.geojson`
- [ ] `BIH_GEOJSON_PATH=./data/bih.geojson` ako koristiš Bosnia polygon logiku
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_API_URL`

Preporuka za isti VM:
- `DATABASE_URL` neka pokazuje na lokalni PostgreSQL na istom serveru ako ga hostaš lokalno
- `OSRM_BASE_URL=http://127.0.0.1:5000`
- PostgreSQL neka sluša samo na `127.0.0.1`

## 4. Lokalni Fajlovi i Storage

- [ ] Kreiran `/var/www/transport/uploads`
- [ ] Nginx `location /uploads` pokazuje na taj folder
- [ ] `data/schengen.geojson` postoji
- [ ] `data/bih.geojson` postoji ako koristiš Bosnia detekciju

## 5. OSRM

- [ ] odlučeno da li OSRM ide preko Docker-a ili native `systemd` servisa
- [ ] ako OSRM ide preko PM2/native, pregledan `ecosystem.osrm.example.config.js`
- [ ] Skinuti OSM za BiH, Hrvatsku, Srbiju i Sloveniju
- [ ] Kreiran `west-balkan.osm.pbf`
- [ ] Prošao `osrm-extract`
- [ ] Prošao `osrm-partition`
- [ ] Prošao `osrm-customize`
- [ ] OSRM container radi na `127.0.0.1:5000`
- [ ] Test prolazi:

```bash
curl "http://localhost:5000/route/v1/driving/18.4131,43.8564;16.4333,43.5119?overview=false"
```

## 6. Geo / Granice / Zone

- [ ] Seed pokrenut
- [ ] Border crossing zone-ovi upisani u bazu
- [ ] Schengen polygon učitava se bez greške
- [ ] Bosnia polygon učitava se bez greške ako je aktivan
- [ ] Landmarki importovani ako ih koristiš

## 7. Cron i Scheduler

- [ ] `transport-cron` PM2 proces radi
- [ ] Ne postoje dupli recurring/notification cronovi u `crontab`
- [ ] U `crontab` postoji samo route-plan cron ako ga želiš van PM2 schedulera:

```cron
0 6 * * * curl -s -X GET "http://localhost:3000/api/cron/generate-route-plan-loads" -H "Authorization: Bearer YOUR_CRON_SECRET" >> /var/log/transport-route-plan-cron.log 2>&1
```

- [ ] Manual test route-plan cron prolazi
- [ ] `pm2 logs transport-cron` ne pokazuje greške

## 8. Mobile

- [ ] `mobile/.env` ima `EXPO_PUBLIC_API_BASE_URL`
- [ ] `mobile/.env` ima `EXPO_PUBLIC_EAS_PROJECT_ID`
- [ ] Production APK build prolazi
- [ ] Login radi iz mobile app
- [ ] Push token registracija radi

## 9. Smoke Test

- [ ] Admin login radi
- [ ] Driver login radi
- [ ] Kreiranje loada radi
- [ ] Dodjela vozača radi
- [ ] Live mapa radi
- [ ] Route replay radi
- [ ] Upload dokumenta radi
- [ ] Telemetry endpoint prima podatke
- [ ] Route plan kreiranje radi
- [ ] Weekly route plan assign radi

## 10. Monitoring

- [ ] `pm2 status` čist
- [ ] `pm2 logs transport-app` čist bez kritičnih grešaka
- [ ] `pm2 logs transport-cron` čist
- [ ] Nginx access/error logovi dostupni
- [ ] Health-check skripta postavljena
- [ ] Telegram alerting radi
- [ ] Backup baze definisan
- [ ] Backup `uploads` foldera definisan

## 11. Security Hardening

- [ ] aplikacija radi pod non-root korisnikom
- [ ] `.env` ima dozvole `600`
- [ ] `uploads` folder nije world-writable
- [ ] `ufw` aktivan
- [ ] otvoreni samo `22`, `80`, `443`
- [ ] `fail2ban` instaliran i aktivan
- [ ] SSH key login podešen
- [ ] `PasswordAuthentication no` ako je moguće
- [ ] `PermitRootLogin no`
- [ ] `unattended-upgrades` aktivan
- [ ] PostgreSQL sluša samo na `127.0.0.1`
- [ ] port `5432` nije javno otvoren
- [ ] Nginx rate limiting postavljen za login/API
- [ ] `server_tokens off`
- [ ] logrotate riješen za Nginx i PM2 logove
- [ ] backup restore testiran
## 12. Go-Live

- [ ] Testni podaci očišćeni ili jasno odvojeni
- [ ] Produkcijski korisnici kreirani
- [ ] Traccar/telemetry ključevi ažurirani na produkcijske
- [ ] Driverima podijeljen APK
- [ ] Dispatcher tim potvrdio da vidi rute, loadove i dokumente
- [ ] Prvih 24h po puštanju pojačan monitoring logova i cronova
