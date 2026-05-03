# Mobile i Operativni Action Plan

Ovaj plan prati nadogradnje koje su najkorisnije za dnevnu operativu. GPS/Traccar evidencija ostaje primarni izvor istine. Driver potvrde služe kao dodatni signal pouzdanosti, ne kao obavezni uslov za validnost događaja.

## Principi

- [x] GPS/Traccar ostaje primarni izvor za Schengen i border evente
- [x] Driver potvrda je dodatna potvrda, ne blokator
- [x] Offline potvrda mora biti lokalno sačuvana i kasnije sinhronizovana
- [x] Admin treba vidjeti status: automatski detektovano / čeka potvrdu / potvrđeno
- [x] Escalation treba obavijestiti operativu ako border event nije potvrđen dovoljno dugo

## Faza 1: Border potvrde i operativni nadzor

- [x] Push notifikacija vozaču za izlazak iz BiH prema EU
- [x] Push notifikacija vozaču za povratak u BiH
- [x] Modal potvrda u mobile app pri otvaranju aplikacije
- [x] Offline queue za driver potvrde
- [x] Backend endpoint za pending border potvrde
- [x] Backend endpoint za potvrdu border događaja
- [x] Prikaz confirmation statusa u web Schengen tabu vozača
- [x] Admin/dispatcher pregled svih nepotvrđenih border događaja
- [x] Alert/escalation za border događaje bez potvrde nakon definisanog perioda
- [x] Vremenska linija: detektovano / push poslano / potvrđeno / potvrđeno offline sync

## Faza 2: Driver mobile operativa

- [x] Prava navigacija kroz `React Navigation`
- [x] Upload dokumenata iz mobile app-a
- [x] Upload POD direktno iz mobile app-a
- [x] Driver inspekcije kompletan flow
- [x] Akcije statusa loada iz mobile app-a
- [x] Offline draftovi za inspekcije, dokumente i status akcije
- [x] In-app inbox za sve driver notifikacije

## Faza 3: Load i dispatch operativa

- [x] Driver checklist po loadu
- [x] Exception reasons za kašnjenje / neuspješan pickup / delivery
- [x] POD required workflow prije finalnog zatvaranja
- [x] Upozorenje na višestruke aktivne loadove po vozaču
- [x] Brzi replay linkovi `1h / 3h / 6h` sa live mape
- [x] ETA warning ako se probija planirano vrijeme

## Faza 4: Compliance i dokumenti

- [x] Dashboard za nedostajuće dokumente
- [x] Obavezni dokumenti po vozaču / kamionu / prikolici
- [x] Reminderi za istek dokumenata i vozaču i administraciji
- [x] Approval workflow za dokumente
- [x] Bulk upload poboljšanja po entitetima

## Faza 5: Audit i izvještavanje

- [x] Audit timeline po vozaču
- [x] Audit timeline po loadu
- [x] Border event audit statusi i ručni override
- [x] Export audit pregleda
- [x] Confidence score za border događaje

## Prioritet implementacije

1. Border confirmation status u webu
2. Escalation alerti za nepotvrđene border evente
3. Driver documents upload
4. Driver inspections full flow
5. Load status akcije iz mobile app-a
6. Notification center / inbox

## Trenutni fokus

- [x] Offline queue za driver confirmation
- [x] Confirmation status u Schengen tabu
- [x] Escalation alarm za nepotvrđene prelaze
- [x] Driver document upload + POD upload
- [x] Driver inspection create/list/detail/photo flow
- [x] Driver load status akcije iz mobile app-a
- [x] Driver in-app inbox notifikacija
- [x] Driver offline queue za load status / inspekcije / dokumente
- [x] Role-based React Navigation tab/stack navigacija
- [x] POD obavezan prije statusa `COMPLETED`
- [x] Load checklist + exception reasons + multi-active warning
- [x] Replay prečice sa live mape + ETA warning na load detaljima
- [x] Compliance dashboard + required items + reminderi
- [x] Document approval workflow + audit timeline po vozaču i loadu
- [x] Border review override + confidence + audit export + entity bulk upload
