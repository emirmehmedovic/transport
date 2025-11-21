# Transport Management App - Task Checklist

## 📋 Kako Koristiti Ovaj Dokument

- ✅ Označite zadatke kako ih završavate
- Zadaci su organizovani po sprintovima i modulima
- Svaki zadatak je bite-size i može se završiti u 1-4 sata
- Redoslijed zadataka je optimizovan za dependency management

---

## SETUP & INITIALIZATION (Sprint 0)

### Environment Setup
- [x] Instaliraj Node.js 18.x ili 20.x
- [x] Instaliraj PostgreSQL 15.x (Neon Database)
- [x] Kreiraj PostgreSQL database `transport_app`
- [x] Kreiraj PostgreSQL user sa pravima
- [x] Instaliraj Git
- [x] Setup Git repository

### Project Initialization
- [x] Kreiraj Next.js 14 projekt sa TypeScript
- [x] Instaliraj Prisma (`npm install prisma @prisma/client`)
- [x] Instaliraj Tailwind CSS
- [x] Instaliraj shadcn/ui komponente (Button, Input, Card)
- [x] Setup Prettier i ESLint
- [x] Kreiraj `.env` file sa potrebnim varijablama
- [x] Kreiraj `.gitignore` (include `.env`, `node_modules`)
- [x] Kreiraj folder strukturu prema planu
- [x] Inicijaliziraj Prisma (`npx prisma init`)
- [x] Test da projekt radi (`npm run dev`)

---

## SPRINT 1: DATABASE & AUTHENTICATION (Week 1) ✅ ZAVRŠENO

### Database Schema
- [x] Definiši `User` model u Prisma schema
- [x] Definiši `UserRole` enum (ADMIN, DISPATCHER, DRIVER)
- [x] Definiši SVE modele (Driver, Truck, Load, Vehicle, Document, PayStub, MaintenanceRecord, TruckExpense, VacationPeriod, AuditLog, Setting)
- [x] Kreiraj inicijalnu migraciju (`npx prisma migrate dev --name init`)
- [x] Testiraj connection sa Prisma Studio (`npx prisma studio`)
- [x] Generiši Prisma client (`npx prisma generate`)

### Authentication - Backend
- [x] Instaliraj `bcrypt` i `jsonwebtoken`
- [x] Kreiraj `/lib/auth.ts` sa helper funkcijama
- [x] Implementiraj `hashPassword()` funkciju
- [x] Implementiraj `comparePassword()` funkciju
- [x] Implementiraj `generateToken()` funkciju
- [x] Implementiraj `verifyToken()` funkciju
- [x] Kreiraj `/api/auth/login` endpoint
- [x] Kreiraj `/api/auth/logout` endpoint
- [x] Kreiraj `/api/auth/me` endpoint (get current user)

### Authentication - Frontend
- [x] Kreiraj `useAuth` hook
- [x] Kreiraj `AuthContext` i `AuthProvider`
- [x] Implementiraj login form komponentu
- [x] Implementiraj password input
- [x] Kreiraj login page (`/app/(auth)/login/page.tsx`)
- [x] Implementiraj redirect nakon logina
- [x] Implementiraj logout funkcionalnost
- [x] Setup JWT token storage (localStorage)

### Middleware & Protection
- [x] Implementiraj protected route checker
- [x] Kreiraj `ProtectedRoute` wrapper komponenta
- [x] Setup redirect na login ako nije authenticated
- [x] Test authentication flow end-to-end

### Initial Seed Data
- [x] Kreiraj seed script (`prisma/seed.ts`)
- [x] Dodaj admin user u seed
- [x] Dodaj test dispatcher user
- [x] Dodaj test driver user sa kompletnim profilom
- [x] Run seed: `npx prisma db seed`

---

## SPRINT 2: USER MANAGEMENT & LAYOUT (Week 2) ✅ ZAVRŠENO

### User Management - Backend
- [x] Kreiraj `/api/users` GET endpoint (list all users)
- [x] Kreiraj `/api/users` POST endpoint (create user)
- [x] Kreiraj `/api/users/[id]` GET endpoint
- [x] Kreiraj `/api/users/[id]` PUT endpoint
- [x] Kreiraj `/api/users/[id]` DELETE endpoint
- [x] Implementiraj role-based permissions check
- [x] Popravljeno: API koristi cookies za token autentifikaciju
- [x] Dodaj pagination na list endpoint
- [x] Dodaj search/filter po imenu, email
- [x] Implementiraj validation (Zod schema)

### User Management - Frontend
- [x] Kreiraj users list page (`/app/(dashboard)/users/page.tsx`)
- [x] Kreiraj user form komponentu
- [x] Kreiraj "Create User" modal/page
- [x] Kreiraj "Edit User" funkcionalnost
- [x] Implementiraj delete user sa confirmation
- [x] Dodaj role select dropdown
- [x] Popravljeno: Ispravna polja iz baze (cdlNumber)
- [x] Implementiraj search bar za users
- [x] Implementiraj pagination komponenta

### Dashboard Layout ✅ ZAVRŠENO
- [x] Kreiraj main layout (`/app/(dashboard)/layout.tsx`)
- [x] Implementiraj Sidebar komponenta
- [x] Dodaj navigation links (Drivers, Trucks, Loads, etc.)
- [x] Implementiraj Header komponenta sa search bar
- [x] Dodaj logout button u sidebar
- [x] Dodaj role badge u sidebar (Admin/Dispatcher/Driver)
- [x] Setup navigation highlighting (active route)
- [x] Implementiraj admin dashboard stranicu sa KPI karticama
- [x] Dodaj "Recent Activity" sekciju
- [x] Dodaj "Quick Actions" sekciju

### UI Components ✅ ZAVRŠENO
- [x] Kreiraj Button komponentu (4 varijante)
- [x] Kreiraj Input komponentu sa label i error
- [x] Kreiraj Card komponente (Card, CardHeader, CardTitle, CardContent)
- [x] Kreiraj utility funkcije (cn helper)

### Translations ✅ ZAVRŠENO
- [x] Prevedi sve tekstove na bosanski jezik
- [x] Login stranica
- [x] Dashboard
- [x] Sidebar navigacija
- [x] Error poruke

---

## SPRINT 3: DRIVERS MODULE - BACKEND (Week 3) ✅ ZAVRŠENO

### Database Schema
- [x] Definiši `Driver` model u Prisma schema
- [x] Definiši `DriverStatus` enum
- [x] Definiši `VacationPeriod` model
- [x] Dodaj relations: User 1:1 Driver
- [x] Kreiraj migraciju (`npx prisma migrate dev --name add-drivers`)

### API Endpoints
- [x] Kreiraj `/api/drivers` GET endpoint (list)
- [x] Implementiraj filters (status, search by name)
- [ ] Implementiraj sorting
- [ ] Dodaj pagination
- [x] Kreiraj `/api/drivers` POST endpoint (create)
- [x] Kreiraj `/api/drivers/[id]` GET endpoint
- [x] Kreiraj `/api/drivers/[id]` PUT endpoint
- [x] Kreiraj `/api/drivers/[id]` DELETE endpoint
- [x] Kreiraj `/api/drivers/[id]/vacation` POST endpoint
- [x] Kreiraj validation schema (Zod) za driver data

### Business Logic
- [x] Implementiraj CDL expiry check funkciju
- [x] Implementiraj medical card expiry check
- [ ] Kreiraj helper za calculate driver performance
- [x] Implementiraj status change validation (can't delete active driver)

---

## SPRINT 4: DRIVERS MODULE - FRONTEND (Week 3 cont.) ✅ ZAVRŠENO

### List View
- [x] Kreiraj drivers list page (`/drivers/page.tsx`)
- [x] Implementiraj DataTable komponenta za drivers
- [x] Dodaj status badge komponenta (Active/Vacation/Sick/Inactive)
- [x] Dodaj search bar
- [x] Implementiraj filter by status
- [x] Dodaj "Create Driver" button
- [x] Implementiraj loading skeleton
- [x] Dodaj error handling i empty state

### Driver Form
- [x] Kreiraj driver form komponentu
- [x] Dodaj basic info fields (name, email, phone)
- [x] Dodaj hire date picker
- [x] Dodaj CDL info fields (number, expiry, state)
- [x] Dodaj endorsements multi-select
- [x] Dodaj medical card expiry field
- [x] Dodaj emergency contact fields
- [x] Dodaj rate per mile input
- [x] Implementiraj form validation
- [x] Implementiraj submit handler

### Create & Edit Pages
- [x] Kreiraj "Create Driver" page (`/drivers/new/page.tsx`)
- [x] Kreiraj "Edit Driver" page (`/drivers/[id]/edit/page.tsx`)
- [x] Implementiraj success/error toast notifications
- [x] Dodaj cancel button (go back)

### Driver Detail Page
- [x] Kreiraj driver detail page (`/drivers/[id]/page.tsx`)
- [x] Prikaži driver info card
- [x] Dodaj edit button
- [x] Dodaj delete button sa confirmation
- [x] Prikaži assigned truck (placeholder za sada)
- [x] Prikaži status badge
- [x] Dodaj tab navigation (Info / Performance / Loads / Documents)

### Vacation/Sick Leave
- [ ] Kreiraj "Add Vacation" modal/form
- [ ] Dodaj date range picker
- [ ] Dodaj type select (Vacation / Sick Leave)
- [x] Implementiraj status auto-change kada je na vacation
- [x] Prikaži current i upcoming vacation periods

---

## SPRINT 5: TRUCKS MODULE - BACKEND (Week 4) ✅ ZAVRŠENO

### Database Schema
- [x] Definiši `Truck` model u Prisma schema
- [x] Definiši `MaintenanceRecord` model
- [x] Definiši `MaintenanceType` enum
- [x] Definiši `TruckExpense` model
- [x] Dodaj relations: Truck 1:1 Driver (primary/backup)
- [x] Kreiraj migraciju

### API Endpoints
- [x] Kreiraj `/api/trucks` GET endpoint (list)
- [x] Implementiraj filters (active, assigned driver)
- [x] Kreiraj `/api/trucks` POST endpoint
- [x] Kreiraj `/api/trucks/[id]` GET endpoint
- [x] Kreiraj `/api/trucks/[id]` PUT endpoint
- [x] Kreiraj `/api/trucks/[id]` DELETE endpoint
- [x] Kreiraj `/api/trucks/[id]/assign-driver` PATCH endpoint

### Maintenance Endpoints
- [x] Kreiraj `/api/trucks/[id]/maintenance` GET endpoint (list)
- [x] Kreiraj `/api/trucks/[id]/maintenance` POST endpoint (create)
- [x] Implementiraj next service due calculation

### Expense Endpoints
- [x] Kreiraj `/api/trucks/[id]/expenses` GET endpoint
- [x] Kreiraj `/api/trucks/[id]/expenses` POST endpoint
- [x] Implementiraj expense aggregation (total by type)

### Validation
- [x] Kreiraj Zod schema za truck data
- [x] Validacija VIN (17 characters)
- [x] Validacija capacity fields (must be > 0)

---

## SPRINT 6: TRUCKS MODULE - FRONTEND (Week 4 cont.) 🔄 U TOKU

### List View
- [x] Kreiraj trucks list page (`/trucks/page.tsx`)
- [x] Implementiraj DataTable za trucks
- [x] Dodaj status badge (Active/Inactive)
- [x] Prikaži assigned driver
- [x] Dodaj search bar (truck number, VIN)
- [x] Dodaj filter by status
- [x] Implementiraj "Create Truck" button

### Truck Form
- [x] Kreiraj truck form komponenta
- [x] Dodaj basic info fields (truck number, VIN, make, model, year)
- [x] Dodaj license plate field
- [x] Dodaj registration expiry picker
- [x] Dodaj insurance fields (expiry, provider, policy number)
- [x] Dodaj current mileage input
- [x] Dodaj capacity configuration fields (max small/medium/large/oversized)
- [x] Implementiraj form validation

### Create & Edit Pages
- [x] Kreiraj "Create Truck" page
- [x] Kreiraj "Edit Truck" page
- [x] Implementiraj submit handler
- [x] Dodaj success/error notifications

### Truck Detail Page
- [x] Kreiraj truck detail page
- [x] Prikaži truck info card
- [x] Prikaži capacity indicator visual
- [x] Dodaj edit/delete buttons
- [x] Prikaži assigned drivers (primary & backup)
- [x] Prikaži recent loads
- [x] Prikaži maintenance records
- [x] Warning badges za expiring registration/insurance

### Assign Driver
- [x] Kreiraj "Assign Driver" modal
- [x] Dodaj primary driver select dropdown
- [x] Dodaj backup driver select dropdown
- [x] Implementiraj validation (ne može isti driver)
- [x] Implementiraj submit i update UI

### Capacity Indicator Component
- [x] Kreiraj visual capacity bar komponenta
- [x] Color code: Green/Yellow/Red
- [x] Prikaži breakdown (small: 6/8, medium: 4/6, etc.)

---

## SPRINT 7: LOADS MODULE PART 1 - BACKEND (Week 5)

### Database Schema
- [x] Definiši `Load` model u Prisma schema
- [x] Definiši `LoadStatus` enum
- [x] Definiši `Vehicle` model (car hauler specific)
- [x] Definiši `VehicleSize` enum
- [x] Dodaj relations: Load → Driver, Load → Truck, Load → Vehicles
- [x] Kreiraj migraciju

### Basic CRUD Endpoints
// Implemented in app/api/loads/route.ts
- [x] Kreiraj `/api/loads` GET endpoint (list)
- [x] Implementiraj filters (status, driver, date range)
- [x] Implementiraj sorting (by date, status)
- [x] Dodaj pagination
- [x] Kreiraj `/api/loads` POST endpoint (create)
- [x] Kreiraj `/api/loads/[id]` GET endpoint
- [x] Kreiraj `/api/loads/[id]` PUT endpoint
- [x] Kreiraj `/api/loads/[id]` DELETE endpoint

### Load Assignment
- [x] Kreiraj `/api/loads/[id]/assign` PATCH endpoint
- [x] Implementiraj validation (check driver/truck availability)
- [x] Implementiraj capacity check prije assignovanja
- [x] Auto-generate load number (LOAD-YYYY-####)

### Status Management
- [x] Kreiraj `/api/loads/[id]/status` PATCH endpoint
- [x] Implementiraj status workflow validation
- [x] Implementiraj auto-timestamps (actualPickup, actualDelivery)
- [x] Kreiraj `/api/loads/[id]/pickup` POST endpoint (mark picked up)
- [x] Kreiraj `/api/loads/[id]/deliver` POST endpoint (mark delivered)

### Vehicle Management
- [x] Kreiraj `/api/loads/[id]/vehicles` POST endpoint (add vehicle)
- [x] Kreiraj `/api/loads/[id]/vehicles/[vehicleId]` DELETE endpoint
- [x] Implementiraj capacity validation kada se dodaje vehicle

---

## SPRINT 8: LOADS MODULE PART 2 - FRONTEND (Week 5-6)

### List View
- [x] Kreiraj loads list page (`/loads/page.tsx`)
- [ ] Implementiraj DataTable za loads
- [ ] Dodaj load status badge komponenta
- [x] Prikaži assigned driver i truck
- [x] Dodaj filter by status dropdown
- [x] Dodaj date range filter
- [x] Dodaj search bar (load number)
- [x] Implementiraj "Create Load" button

### Load Form - Basic Info
- [x] Kreiraj multi-step load form komponenta
- [x] **Step 1:** Basic Info
  - [x] Load number (auto-generated, disabled)
  - [x] Scheduled pickup date/time
  - [x] Scheduled delivery date/time
- [x] **Step 2:** Pickup Details
  - [x] Pickup address fields (address, city, state, zip)
  - [x] Pickup contact (name, phone)
- [x] **Step 3:** Delivery Details
  - [x] Delivery address fields
  - [x] Delivery contact
- [x] Implementiraj validation za svaki step
- [x] Dodaj "Next" / "Back" / "Cancel" buttons

### Load Form - Financial & Details
- [x] **Step 4:** Load Details
  - [x] Distance input
  - [x] Deadhead miles input
  - [x] Load rate input
  - [x] Custom rate per mile (optional override)
  - [x] Detention time & pay
  - [x] Notes textarea
  - [x] Special instructions textarea
  - [x] Implementiraj auto-calculation (total pay)
- [x] **Step 5:** Add Vehicles
  - [x] Lista dodanih vehicles
  - [x] "Add Vehicle" button otvara formu u sklopu koraka
  - [x] Vehicle form (VIN, make, model, year, color, size, operable, notes)
  - [x] Capacity indicator (updates sa svakim dodanim vehiclom)
  - [x] Delete vehicle button
  - [x] Validacija - warning ako blizu kapaciteta
  - [x] Implementiraj capacity check
- [x] **Step 6:** Assignment
  - [x] Driver select dropdown
  - [x] Truck select dropdown (only trucks assigned to selected driver)
  - [x] Validation: check capacity fit
  - [x] Display warning ako capacity overflow
- [x] Final review step (summary)
- [x] Submit button i handler
- [x] Dodaj "Next" / "Back" / "Cancel" buttons
- [x] Dodaj success/error notifications za create (Loads list banner)

### Load Detail Page
- [x] Kreiraj load detail page
- [x] Prikaži load summary card
- [x] Prikaži status badge
- [x] Prikaži assigned driver & truck
- [x] Prikaži pickup & delivery info
- [x] Prikaži vehicles lista
- [x] Dodaj edit button (only if not completed)
- [x] Dodaj delete button (only if available/cancelled)
- [x] Kreiraj tab navigation (Info / Documents / Timeline)

### Load Timeline Component
- [x] Kreiraj timeline visual komponenta
- [ ] Prikaži statuses sa timestamps:
  - [x] Created
  - [x] Picked Up (actual time ili planirani pickup)
  - [x] Delivered (actual time ili planirani delivery)
  - [ ] Assigned
  - [ ] In Transit
  - [ ] Completed
- [x] Color code past/current/future steps

### Status Update Actions
- [x] Dodaj "Mark as Picked Up" button (only for assigned loads)
- [x] Dodaj "Mark as Delivered" button (only for in-transit loads)
- [x] Dodaj "Mark as Completed" button (only for delivered loads)
- [x] Implementiraj confirmation dialogs
- [x] Update UI immediately (optimistic update)

---

## SPRINT 9: RECURRING LOADS (Week 6)

### Backend
- [x] Dodaj `isRecurring` i `recurringGroupId` fields u Load model
- [x] Kreiraj migraciju
- [x] Kreiraj `/api/loads/recurring` GET endpoint (list templates)
- [x] Kreiraj `/api/loads/recurring` POST endpoint (create template)
- [x] Implementiraj recurring frequency logic (daily/weekly/monthly)

### Cron Job
- [ ] Setup cron job runner (node-cron)
- [x] Implementiraj funkciju za kreiranje loadova from templates
- [ ] Run svaku noć u midnight
- [x] Dodaj logging za kreirane loadove

> Napomena: stvarni cron/PM2 scheduler za pokretanje `npm run recurring:run-today` svakih 24h treba podesiti u produkcijskom/deployment okruženju (izvan same aplikacije).

### Frontend
- [x] Kreiraj recurring loads page (`/loads/recurring/page.tsx`)
- [x] Lista recurring templates sa details
- [x] "Create Recurring Load" form
- [x] Dodaj frequency selector
- [x] Dodaj day of week/month selector
- [x] Recurring badge na load list (🔄)
- [x] Link to see all loads u recurring group

---

## SPRINT 10: DOCUMENTS MODULE (Week 7) ✅ ZAVRŠENO

### Database Schema
- [x] Definiši `Document` model
- [x] Definiši `DocumentType` enum
- [x] Dodaj relations: Document → Load, Document → Driver
- [x] Kreiraj migraciju

### File Upload Setup
- [x] Setup uploads folder structure na serveru
- [x] Instaliraj pakete za file uploads (file-type, uuid)
- [x] Kreiraj `/lib/fileUpload.ts` helper
- [x] Implementiraj file validation (size, MIME type)
- [x] Implementiraj filename sanitization

### API Endpoints
- [x] Kreiraj `/api/documents/upload` POST endpoint
- [x] Implementiraj file save logic
- [x] Kreiraj `/api/documents` GET endpoint (list sa filterima)
- [x] Kreiraj `/api/documents/[id]` GET endpoint (metadata)
- [x] Kreiraj `/api/documents/[id]/download` GET endpoint (serve file)
- [x] Kreiraj `/api/documents/[id]` DELETE endpoint
- [x] Kreiraj `/api/documents/expiring` GET endpoint (compliance docs)

### Document Organization
- [x] Implementiraj folder logic (by document type)
- [x] Implementiraj subfolder logic (by load ID, driver ID)
- [x] Dodaj cleanup za deleted documents (soft delete files)

### Frontend - Upload Component
- [x] Kreiraj `DocumentUpload` komponenta
- [x] Implementiraj drag & drop area
- [x] Dodaj file type selector dropdown
- [x] Dodaj upload progress bar
- [x] Implementiraj multi-file upload
- [x] Dodaj validation messages (size, type)
- [x] Preview uploaded files (file list sa size)

### Frontend - Document List
- [x] Kreiraj `DocumentList` komponenta
- [x] Prikaži documents u tabeli (name, type, size, uploaded by, date)
- [x] Dodaj download button za svaki doc
- [x] Dodaj delete button (sa confirmation)
- [x] Filter by document type
- [x] Search by filename

### Frontend - Document Viewer
- [x] Kreiraj `DocumentViewer` modal komponenta
- [x] Implementiraj image preview
- [x] Implementiraj PDF viewer (iframe)
- [x] Dodaj zoom controls za images (50%-200%)
- [x] Dodaj download button

### Integration sa Load Detail Page
- [x] Kreiraj `DocumentsTab` reusable komponenta
- [x] Prikaži sve documents za load (via loadId prop)
- [x] Upload funkcionalnost sa auto-link na load
- [x] Dokumentovao integration u `/docs/documents-module-integration.md`

### Integration sa Driver Detail Page
- [x] `DocumentsTab` radi i sa driverId prop
- [x] Prikaži compliance documents (licence, medical card)
- [x] Warning badges za expiring documents (crveno/žuto)
- [x] Upload compliance docs funkcionalnost sa expiry date

---

## SPRINT 11: WAGES & PAY STUBS (Week 8) ✅ ZAVRŠENO

### Database Schema
- [x] Definiši `PayStub` model
- [x] Dodaj relation: PayStub → Driver
- [x] Kreiraj migraciju

### Wage Calculation Logic
- [x] Kreiraj `/lib/wageCalculator.ts`
- [x] Implementiraj `calculatePay()` funkciju
- [x] Handle default rate vs custom rate per load
- [x] Include detention pay
- [x] Calculate totals (miles, amount, avg rate)

### API Endpoints
- [x] Kreiraj `/api/wages/calculate` POST endpoint
- [x] Input: driverId, periodStart, periodEnd
- [x] Return calculation results
- [x] Kreiraj `/api/wages/pay-stubs` POST endpoint (generate)
- [x] Kreiraj `/api/wages/pay-stubs` GET endpoint (list)
- [x] Kreiraj `/api/wages/pay-stubs/[id]` GET endpoint
- [x] Kreiraj `/api/wages/pay-stubs/[id]/generate-pdf` POST endpoint
- [x] Kreiraj `/api/wages/pay-stubs/[id]/mark-paid` PATCH endpoint

### PDF Generation
- [x] Instaliraj `pdfkit`
- [x] Kreiraj pay stub PDF template
- [x] Implementiraj header (company info)
- [x] Implementiraj driver info section
- [x] Implementiraj loads table (load #, miles, rate, amount, detention)
- [x] Implementiraj totals section (summary)
- [x] Implementiraj footer
- [x] Save PDF u `/uploads/pay-stubs/` folder

### Frontend - Wages Page
- [x] Kreiraj wages page (`/wages/page.tsx`)
- [x] "Generate Pay Stub" button
- [x] Modal sa:
  - [x] Driver select dropdown
  - [x] Period start date picker
  - [x] Period end date picker
- [x] "Generate Pay Stub" button kreira pay stub
- [x] Success notification
- [x] Pay stubs list sa tabelom
- [x] Prikaži: Stub #, Driver, Period, Total Miles, Total Amount, Paid Status
- [x] "Generate PDF" button za stubs bez PDF-a
- [x] "Mark as Paid" button (sa confirmation)

### Frontend - Additional Features
- [x] Stats cards (Total, Unpaid, Paid)
- [x] Real-time status badges
- [x] Integrated list i generate na istoj stranici

---

## SPRINT 12: PERFORMANCE & ANALYTICS PART 1 (Week 9) ✅ ZAVRŠENO

### Driver Performance Backend
- [x] Kreiraj `/api/drivers/[id]/performance` GET endpoint
- [x] Implementiraj calculation funkcije:
  - [x] Total miles
  - [x] Total revenue
  - [x] Completed loads
  - [x] On-time delivery rate
  - [x] Average miles per load
  - [x] Average revenue per mile
- [x] Dodaj date range filter
- [x] Return time series data za charts

### Truck Performance Backend
- [x] Kreiraj `/api/trucks/[id]/performance` GET endpoint
- [x] Implementiraj calculations:
  - [x] Total miles
  - [x] Active days
  - [x] Loads completed
  - [x] Revenue generated
  - [x] Fuel cost per mile
  - [x] Maintenance cost per mile
  - [x] Uptime percentage
- [x] Dodaj date range filter

### Comparison Backend
- [x] Kreiraj `/api/drivers/compare` GET endpoint (Sprint 13)
- [x] Input: array of driver IDs (Sprint 13)
- [x] Return comparison table data (Sprint 13)
- [x] Kreiraj `/api/trucks/compare` GET endpoint (Sprint 13)
- [x] Input: array of truck IDs (Sprint 13)

### Frontend - Driver Performance Page
- [x] Kreiraj performance tab na driver detail page
- [x] Dodaj date range selector (last 7/30/90 days, custom)
- [x] Prikaži KPI cards:
  - [x] Total Miles
  - [x] Completed Loads
  - [x] Total Revenue
  - [x] On-Time Delivery %
- [x] Instaliraj Recharts (`npm install recharts`)

### Charts - Driver Performance
- [x] Line chart: Miles over time
- [x] Line chart: Revenue over time
- [x] Bar chart: Loads per week
- [x] Additional metrics: Deadhead miles, Utilization rate

### Frontend - Truck Performance Page
- [x] Kreiraj performance tab na truck detail page
- [x] Date range selector
- [x] KPI cards:
  - [x] Total Miles
  - [x] Active Days (Loads Completed)
  - [x] Revenue Generated
  - [x] Cost per Mile
- [x] Charts:
  - [x] Line chart: Miles over time
  - [x] Bar chart: Revenue vs Costs
  - [x] Fuel & Maintenance cost breakdown

---

## SPRINT 13: PERFORMANCE & ANALYTICS PART 2 (Week 9-10) ✅ ZAVRŠENO

### Driver Comparison Page
- [x] Kreiraj comparison page (`/drivers/compare`)
- [x] Multi-select dropdown za drivers
- [x] "Compare" button
- [x] Side-by-side comparison table
- [x] Bar charts za visual comparison (4 charts: Miles, Revenue, Loads, On-Time%)
- [x] Export to CSV button

### Truck Comparison Page
- [x] Kreiraj comparison page (`/trucks/compare`)
- [x] Multi-select dropdown za trucks
- [x] Comparison table i charts (4 charts: Miles, Revenue, Loads, Uptime%)
- [x] Export to CSV functionality

### Reports Page
- [x] Kreiraj reports page (`/reports/page.tsx`)
- [x] Report type selector:
  - [x] Driver Performance (linkuje na /drivers)
  - [x] Truck Performance (linkuje na /trucks)
  - [x] Revenue Report (API ready, frontend TBD)
  - [x] Expense Report (API ready, frontend TBD)
- [x] Quick Links section za brzi pristup
- [x] Comparison Tools section sa linkovima na compare stranice

### Revenue Report API
- [x] API endpoint: `/api/reports/revenue`
- [x] Aggregate revenue by period (daily/weekly/monthly)
- [x] Breakdown by driver
- [x] Breakdown by truck
- [x] Time series data za charts
- [x] Frontend UI za vizualizaciju (Sprint 14+)
- [x] Export to PDF button (Sprint 14+)

### Expense Report API
- [x] API endpoint: `/api/reports/expenses`
- [x] Aggregate expenses by type (fuel, maintenance)
- [x] By truck
- [x] By period (daily/weekly/monthly)
- [x] Time series data
- [x] Maintenance breakdown by type
- [x] Frontend UI za vizualizaciju (Sprint 14+)
- [x] Export functionality (Sprint 14+)

### Comparison APIs
- [x] `/api/drivers/compare` endpoint
- [x] `/api/trucks/compare` endpoint
- [x] Rankings calculation
- [x] Support for 2-10 entities comparison

### Custom Report Builder
- [ ] Kreiraj advanced report builder UI (Sprint 14+)
- [ ] Select entities (drivers, trucks, loads)
- [ ] Select metrics (columns)
- [ ] Select date range
- [ ] Select grouping (by driver, by truck, by month)
- [ ] Generate custom table
- [ ] Export to Excel (using xlsx library)

---

## SPRINT 14: DASHBOARDS (Week 10) ✅ ZAVRŠENO

### Admin Dashboard Backend
- [x] Kreiraj `/api/dashboard/admin` GET endpoint
- [x] Return KPIs:
  - [x] Active loads count
  - [x] Revenue (today, this week, this month)
  - [x] Drivers on road count
  - [x] Active trucks count
  - [x] Alerts count
- [x] Return chart data (revenue trend)
- [x] Return active loads for map

### Admin Dashboard Frontend
- [x] Kreiraj admin dashboard page (`/app/(dashboard)/page.tsx`)
- [x] 4 KPI cards (top row)
- [x] Map view placeholder (to be implemented)
- [x] Alerts panel (red warnings)
- [x] Revenue trend chart (last 6 mjeseci)
- [x] Quick actions section (Create Load, Add Driver, etc.)

### Driver Dashboard Backend
- [x] Kreiraj `/api/dashboard/driver/:id` GET endpoint
- [x] Return current load details
- [x] Return current month stats (miles, loads, earnings)
- [x] Return recent loads (last 5)

### Driver Dashboard Frontend
- [x] Kreiraj driver-specific dashboard
- [x] Current load card (prominent)
- [x] Vehicle details za current load
- [x] Quick actions (Upload POD, Update Status)
- [x] This Month summary (3 cards)
- [x] Recent loads table
- [x] Conditional rendering: if no active load, show next scheduled

### Map View ✅ ZAVRŠENO
- [x] Install Leaflet.js (`npm install leaflet react-leaflet @types/leaflet`)
- [x] Kreiraj `ActiveLoadsMap` komponenta
- [x] Fetch active loads data
- [x] Plot pickup markers (blue)
- [x] Plot delivery markers (red)
- [x] Draw lines connecting pickup → delivery
- [x] Add truck icon (placeholder - will be GPS later)
- [x] Implement marker click → show load info popup
- [x] Add zoom controls
- [x] Center map on US (or your region)
- [x] Kreiraj `LocationPicker` komponenta sa Nominatim geocoding
- [x] Integriraj LocationPicker u Create Load stranicu (pickup i delivery)
- [x] Implementiraj address search funkcionalnost
- [x] Implementiraj click-to-place marker
- [x] Implementiraj reverse geocoding (koordinate → adresa)
- [x] Automatsko popunjavanje adresnih polja

---

## SPRINT 15: TELEGRAM NOTIFICATIONS (Week 11) ✅ OSNOVNE NOTIFIKACIJE ZAVRŠENE

### Telegram Setup ✅ ZAVRŠENO
- [x] Kreiraj Telegram bot (via BotFather)
- [x] Dobij bot token
- [x] Dodaj token u `.env` file
- [x] Instaliraj axios (ako već nije)
- [x] Kreiraj `/lib/telegram.ts` helper

### Telegram Helper Functions ✅ ZAVRŠENO
- [x] Implementiraj `sendTelegramNotification()` funkciju
- [x] Kreiraj notification templates:
  - [x] Load assigned
  - [x] Status changed
  - [x] Document uploaded
  - [x] Maintenance due
  - [x] Compliance expiring
- [x] Handle errors gracefully (log, don't block app)

### Notification Triggers - Loads ✅ ZAVRŠENO
- [x] Trigger na load assignment (novi load assigned)
- [x] Trigger na status change (picked up, delivered)
- [x] Send na admin chat ID
- [x] Send na driver chat ID (ako postoji)

### Notification Triggers - Documents ✅ ZAVRŠENO
- [x] Trigger na document upload
- [x] Include load number i document type
- [x] Send na admin chat

### Notification Triggers - Maintenance 🔜 ZA KASNIJE
- [ ] Implementiraj check za maintenance due (cron job)
- [ ] Ako truck blizu oil change mileage, send notification
- [ ] Ako maintenance overdue, send urgent notification

### Notification Triggers - Compliance 🔜 ZA KASNIJE
- [ ] Implementiraj check za expiring compliance docs (cron job)
- [ ] Check CDL expiry, medical card, insurance, registration
- [ ] Send alert 30 days prije
- [ ] Send alert 15 days prije
- [ ] Send alert 7 days prije

### User Chat ID Management ✅ ZAVRŠENO (polje već postoji)
- [x] Dodaj `telegramChatId` field u User model
- [x] Kreiraj migraciju
- [ ] Dodaj field u user form 🔜 ZA KASNIJE
- [ ] Admin može edit chat ID za users 🔜 ZA KASNIJE
- [ ] Driver može set svoj chat ID u settings 🔜 ZA KASNIJE

### Testing ✅ ZAVRŠENO
- [x] Test send notification manually (test endpoint)
- [x] Test različite template varijante
- [x] Test error handling (invalid chat ID)

---

## SPRINT 16: ALERTS SYSTEM (Week 11) ✅ ZAVRŠENO

### Alerts Backend ✅ ZAVRŠENO
- [x] Kreiraj `/api/dashboard/alerts` GET endpoint
- [x] Query za compliance docs expiring u sljedećih 30 dana
- [x] Query za maintenance due (within 500 miles)
- [x] Query za loads missing POD (>24h after delivery)
- [x] Query za unpaid pay stubs (>30 days)
- [x] Return kategorisane alerts (urgent, warning, info)

### Alerts Frontend ✅ ZAVRŠENO
- [x] Kreiraj `AlertsPanel` komponenta
- [x] Display alerts lista sa icons:
  - [x] 🔴 Urgent (red)
  - [x] ⚠️ Warning (yellow)
  - [x] ℹ️ Info (blue)
- [x] Sort by urgency, then by date
- [x] Dodaj "View All" link
- [ ] Badge count u header (notification bell icon) 🔜 ZA KASNIJE

### Alerts Page ✅ ZAVRŠENO
- [x] Kreiraj dedicated alerts page (`/alerts`)
- [x] Filter by type (compliance, maintenance, documents, financial)
- [x] Filter by urgency
- [x] Click alert → navigate to relevant page (driver detail, truck detail, load detail)
- [ ] "Dismiss" button (mark as acknowledged) 🔜 ZA KASNIJE

### Alert Acknowledgment 🔜 ZA KASNIJE
- [ ] Dodaj `acknowledgedAt` i `acknowledgedBy` fields (optional)
- [ ] API endpoint za dismiss alert
- [ ] Update UI immediately

---

## SPRINT 17: AUDIT LOG SYSTEM (Week 12) ✅ ZAVRŠENO

### Database Schema ✅ ZAVRŠENO
- [x] `AuditLog` model već postoji u schema
- [x] Verify relations (User)
- [x] Kreiraj migraciju ako treba (već postojala)

### Audit Middleware ✅ ZAVRŠENO
- [x] Kreiraj `/lib/auditLog.ts` helper
- [x] Implementiraj `createAuditLog()` funkciju
- [x] Input: userId, action, entity, entityId, changes (before/after)
- [x] Wrap API calls sa audit logging (helper funkcije kreirane)

### Integration - User Management ✅ ZAVRŠENO (već postojalo)
- [x] Log user creation
- [x] Log user update (capture changed fields)
- [x] Log user deletion
- [x] Log role changes

### Integration - Drivers ✅ ZAVRŠENO (već postojalo)
- [x] Log driver creation
- [x] Log driver updates (especially status, wage rate)
- [x] Log driver deletion

### Integration - Trucks ✅ ZAVRŠENO (već postojalo)
- [x] Log truck creation/updates/deletion
- [x] Log driver assignments

### Integration - Loads ✅ ZAVRŠENO (već postojalo)
- [x] Log load creation
- [x] Log load assignments
- [x] Log status changes
- [x] Log load updates

### Integration - Documents ✅ ZAVRŠENO (već postojalo)
- [x] Log document uploads (who uploaded what)
- [x] Log document deletions

### Integration - Wages 🔜 ZA KASNIJE
- [ ] Log pay stub generation
- [ ] Log mark as paid

### Audit Log Viewer Backend ✅ ZAVRŠENO
- [x] Kreiraj `/api/audit-logs` GET endpoint (admin only)
- [x] Implement filters:
  - [x] By user
  - [x] By entity type
  - [x] By action type
  - [x] By date range
- [x] Implement search by entity ID
- [x] Pagination

### Audit Log Viewer Frontend ✅ ZAVRŠENO
- [x] Kreiraj audit logs page (`/audit-logs`)
- [x] DataTable sa logs
- [x] Columns: Timestamp, User, Action, Entity, Entity ID
- [x] Filter dropdowns
- [ ] Date range picker 🔜 ZA KASNIJE
- [ ] Search bar (entity ID) 🔜 ZA KASNIJE
- [x] "View Details" button otvara modal

### Audit Log Detail Modal ✅ ZAVRŠENO
- [x] Prikaži full log entry
- [x] Prikaži before/after JSON (pretty format)
- [ ] Highlight changed fields 🔜 ZA KASNIJE
- [ ] Link to entity (go to driver/truck/load detail) 🔜 ZA KASNIJE

---

## SPRINT 18: FINAL POLISH & TESTING (Week 12) ⚡ U TOKU

### UI/UX Polish 🔜 ZA KASNIJE
- [ ] Review svih stranica za consistent styling
- [ ] Provijeri responsive design (test na tablet, mobile)
- [ ] Dodaj loading states gdje nedostaju
- [ ] Dodaj error boundaries za React components
- [ ] Improve empty states (friendly messages, illustrations)
- [ ] Dodaj tooltips gdje je potrebno
- [ ] Keyboard shortcuts (npr. Ctrl+K za search)

### Performance Optimization 🔜 ZA KASNIJE
- [ ] Review database queries (check for N+1 problems)
- [ ] Dodaj indices na često queriane fields
- [ ] Implement lazy loading za images
- [ ] Code splitting za large pages
- [ ] Review bundle size (Next.js bundle analyzer)

### Security Hardening ✅ OSNOVNE STVARI ZAVRŠENE
- [x] Review svih API endpoints za permission checks
- [ ] Test protected routes 🔜 ZA TESTIRANJE
- [x] Implement rate limiting (middleware sa 100 req/min)
- [x] Add CORS configuration
- [x] Add security headers (XSS, MIME, Clickjacking protection)
- [ ] Review file upload validation 🔜 ZA KASNIJE
- [ ] SQL injection test (Prisma should handle, but verify) 🔜 ZA KASNIJE
- [ ] XSS test (sanitize user inputs) 🔜 ZA KASNIJE

### Testing
- [ ] Write unit tests za critical functions (wage calculator, capacity validator)
- [ ] Write integration tests za API endpoints
- [ ] Manual testing - complete user flows:
  - [ ] Create driver → assign truck → create load → assign load → complete load → generate pay stub
  - [ ] Upload documents → download documents
  - [ ] Check alerts → resolve alerts
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Test na različitim screen sizes

### Documentation ✅ OSNOVNE STVARI ZAVRŠENE
- [x] Write README.md sa setup instructions
- [x] Document environment variables (u README)
- [x] Write deployment guide (u README)
- [ ] Create user guide (admin) 🔜 ZA KASNIJE
- [ ] Create user guide (dispatcher) 🔜 ZA KASNIJE
- [ ] Create user guide (driver) 🔜 ZA KASNIJE
- [ ] Document API endpoints (auto-generate or manual) 🔜 ZA KASNIJE

### Deployment Preparation
- [ ] Setup production database
- [ ] Configure environment variables na serveru
- [ ] Setup Nginx reverse proxy
- [ ] Configure SSL certificate (Let's Encrypt)
- [ ] Setup PM2 for process management
- [ ] Configure PM2 to start on boot
- [ ] Setup daily backup cron job
- [ ] Setup weekly full backup
- [ ] Test backup restore procedure

### Go Live
- [ ] Deploy na server
- [ ] Run database migrations
- [ ] Seed initial admin user
- [ ] Test production environment
- [ ] Create accounts za sve admins, dispatchers, drivers
- [ ] Train users (schedule sessions)
- [ ] Monitor logs prva sedmica
- [ ] Collect feedback
- [ ] Plan iteration 1 improvements

---

## BACKLOG (Future Sprints)

### Mobile App Features
- [ ] Design Android app architecture
- [ ] Setup React Native projekt
- [ ] Implement authentication
- [ ] Driver dashboard mobile view
- [ ] GPS tracking integration
- [ ] Push notifications
- [ ] Offline mode
- [ ] Camera integration za documents
- [ ] Voice notes za damage reports

### Advanced Analytics
- [ ] Predictive maintenance (ML model)
- [ ] Route optimization algorithm
- [ ] Demand forecasting
- [ ] Customer profitability analysis
- [ ] Fuel efficiency trends
- [ ] Driver safety scoring (advanced)

### Customer Portal
- [ ] Customer account creation
- [ ] Quote request form
- [ ] Shipment tracking (public page)
- [ ] Invoice viewer
- [ ] Driver rating system
- [ ] Customer notifications

### Integrations
- [ ] QuickBooks API integration
- [ ] ELD device integration
- [ ] Fuel card system API
- [ ] DAT Load Board integration
- [ ] Truckstop.com integration
- [ ] SMS gateway za notifications (alternative to Telegram)

### Advanced Features
- [ ] Digital signatures (e-sign)
- [ ] Automated invoicing
- [ ] Multi-language support
- [ ] Voice commands
- [ ] AI chatbot support
- [ ] Advanced reporting (custom queries)
- [ ] White-label options

---

## NOTES & TIPS

### Development Tips
- **Git workflow:** Commit často, write clear messages
- **Branch strategy:** main → dev → feature branches
- **Code review:** Review svoj kod prije commit-a
- **Testing:** Test happy path + edge cases
- **Error handling:** Always handle errors gracefully, never let app crash
- **Logging:** Log important events (errors, auth attempts, etc.)

### Common Issues & Solutions
- **Prisma sync issues:** Run `npx prisma generate` after schema changes
- **Migration conflicts:** Resolve manually, never `--force` u production
- **File upload issues:** Check folder permissions (chmod 755)
- **JWT token issues:** Verify secret, check expiry times
- **Performance:** Use React Query za caching, reduce re-renders

### Time Estimates
- Jednostavni CRUD endpoint: 1-2 sata
- Complex form sa validation: 3-4 sata
- Dashboard page sa charts: 4-6 sati
- PDF generation: 4-6 sati
- Complete module (backend + frontend): 3-5 dana

### Priority Legend
- 🔴 Critical (must have za MVP)
- 🟡 Important (nice to have za MVP)
- 🟢 Optional (može kasnije)

---

## COMPLETION TRACKING

- Total Tasks: 550+
- Completed: ☐☐☐☐☐☐☐☐☐☐ 0%

**Current Sprint:** Sprint 0 - Setup
**Next Milestone:** Complete Authentication
**Target MVP Date:** 12 sedmica od starta

---

*Good luck! Strihruj svaki zadatak kako napreduješ. Svaki ✅ je korak bliže gotovom proizvodu! 🚀*
