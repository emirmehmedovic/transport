# Production Monitoring And Backup Checklist

## Monitoring

- [ ] Pratiti CPU, RAM i disk zauzeće na VM-u
- [ ] Pratiti rast PostgreSQL baze, posebno `Position` tabele
- [ ] Pratiti broj aktivnih PostgreSQL konekcija
- [ ] Pratiti `5xx` greške na aplikaciji i API rutama
- [ ] Pratiti `429` rate-limit odgovore za:
- [ ] `/api/auth/login`
- [ ] `/api/auth/refresh`
- [ ] `/api/telemetry`
- [ ] Pratiti zadnji telemetry prijem po vozaču / uređaju
- [ ] Pratiti broj vozača bez GPS update-a duže od očekivanog
- [ ] Pratiti pending mobile potvrde i offline sync backlog
- [ ] Pratiti disk prostor u `uploads/`
- [ ] Pratiti SSL certifikat i datum isteka

## Backup

- [ ] Dnevni `pg_dump` baze
- [ ] Zadržati najmanje 7-14 dnevnih backup kopija
- [ ] Držati barem jednu kopiju backupa van glavnog VM-a
- [ ] Povremeno testirati restore baze na test okruženju
- [ ] Backupovati `uploads/` direktorij
- [ ] Backupovati `.env` i deployment konfiguraciju na siguran način
- [ ] Dokumentovati tačan restore postupak

## Operativne provjere

- [ ] Nakon svakog deploy-a provjeriti login
- [ ] Provjeriti refresh/logout flow
- [ ] Provjeriti telemetry prijem sa test uređaja
- [ ] Provjeriti live mapu i replay
- [ ] Provjeriti Schengen obračun i border evente
- [ ] Provjeriti upload/download dokumenata
- [ ] Provjeriti mobile push i offline confirmation sync
