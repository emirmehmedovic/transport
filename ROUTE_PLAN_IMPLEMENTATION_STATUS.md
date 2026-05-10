# Weekly Route Planning System - Implementation Status

## ✅ Completed (Backend & Core Infrastructure)

### Phase 1: Database Schema ✅
- [x] Added `RoutePlanStatus` enum (DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELLED)
- [x] Added `RoutePlanDayOfWeek` enum (MONDAY-SUNDAY)
- [x] Updated `AppNotificationType` enum with route plan types
- [x] Updated `AuditEntity` enum with ROUTE_PLAN
- [x] Created `WeeklyRoutePlan` model with all required fields
- [x] Created `RoutePlanStop` model with landmark/custom address support
- [x] Added relations to Driver, Truck, User, Landmark, Load models
- [x] Migration created and applied successfully

### Phase 2: Helper Functions & Validation ✅
- [x] Created `/lib/validation/route-plan.ts` with Zod schemas:
  - `routePlanSchema` - Full validation for creation
  - `routePlanUpdateSchema` - Validation for updates
  - `routePlanAssignSchema` - Driver/truck assignment
  - `routePlanGenerateLoadsSchema` - Load generation params
- [x] Created `/lib/route-plan-helpers.ts` with core functions:
  - `getDatesForDaysOfWeek()` - Calculate dates for selected weekdays
  - `loadExistsForDate()` - Duplicate prevention check
  - `createLoadFromRoutePlan()` - Generate single load from plan
  - `generateLoadsForRoutePlan()` - Generate all loads for date range
  - Helper functions for date calculations

### Phase 3: API Endpoints ✅
All endpoints implemented with proper authentication, authorization, and error handling:

#### Core CRUD
- [x] `GET /api/route-plans` - List with filters (status, driver, truck, dates)
- [x] `POST /api/route-plans` - Create new plan (ADMIN, DISPATCHER only)
- [x] `GET /api/route-plans/[id]` - Get plan details
- [x] `PUT /api/route-plans/[id]` - Update plan (DRAFT only)
- [x] `DELETE /api/route-plans/[id]` - Cancel plan (soft delete)

#### Actions
- [x] `POST /api/route-plans/[id]/assign` - Assign to driver/truck with notifications
- [x] `POST /api/route-plans/[id]/generate-loads` - Manual load generation

#### Driver Access
- [x] `GET /api/drivers/[id]/route-plans` - Driver's plans (with role checks)
- [x] `GET /api/mobile/driver/route-plans` - Mobile optimized endpoint

#### Automation
- [x] `GET /api/cron/generate-route-plan-loads` - Daily cron job (6 AM)
- [x] Vercel cron configuration in `vercel.json`

### Phase 4: Frontend Components (Partial) ✅
Basic components created:
- [x] `RoutePlanStatusBadge` - Status display with colors
- [x] `WeekDaySelector` - Interactive weekday selection
- [x] `LandmarkPicker` - Landmark search and selection

## 🚧 Remaining Work (Frontend Pages & Integration)

### Phase 5: Complete Remaining Components
Need to create:
- [ ] `RoutePlanStopForm` - Stop creation/editing form
- [ ] `AssignRoutePlanModal` - Driver/truck assignment modal
- [ ] `RoutePlanPreviewMap` - Map with stops and route preview

### Phase 6: Frontend Pages
- [ ] `/app/(dashboard)/route-plans/page.tsx` - List page with filters
- [ ] `/app/(dashboard)/route-plans/new/page.tsx` - 5-step creation wizard
- [ ] `/app/(dashboard)/route-plans/[id]/page.tsx` - Detail page

### Phase 7: Integration
- [ ] Update `/app/(dashboard)/loads/page.tsx` - Add route plan button
- [ ] Update `/app/(dashboard)/dashboard/page.tsx` - Add driver weekly routes section
- [ ] Update `/components/layout/Sidebar.tsx` - Add Route Plans nav link

### Phase 8: Mobile App
- [ ] `/mobile/src/screens/RoutePlansScreen.tsx` - Driver mobile view
- [ ] Navigation and deep linking setup

## 🔧 Implementation Guide for Remaining Work

### Component: RoutePlanStopForm
```typescript
// Key features:
// - Radio: "Landmark" vs "Custom Address"
// - If Landmark: Use <LandmarkPicker>
// - If Custom: Use existing <LocationPicker>
// - Contact info fields
// - Time offset input (minutes from start)
// - Items textarea
```

### Component: AssignRoutePlanModal
```typescript
// Key features:
// - Driver searchable dropdown (ACTIVE only)
// - Truck searchable dropdown (active only)
// - "Send notification" checkbox (default: true)
// - Submit → POST /api/route-plans/[id]/assign
// - Show success/error messages
```

### Page: List Page (/route-plans/page.tsx)
Structure:
1. PageHeader with "Kreiraj sedmični plan" button
2. Filter bar (status, driver, truck, date range)
3. DataTable for desktop / Cards for mobile
4. Columns: Plan Name, Status, Date Range, Days, Driver/Truck, Loads Count, Actions
5. Pagination

### Page: Create Wizard (/route-plans/new/page.tsx)
5 steps:
1. Basic Info (name, dates, days of week, cargo type)
2. Pickup Stop (RoutePlanStopForm type=PICKUP)
3. Delivery & Waypoints (RoutePlanStopForm, add/remove/reorder)
4. Load Details (distance, rates, detention, notes)
5. Review & Submit (summary + map preview)

Draft saving: localStorage `route-plan-draft-v1`

### Page: Detail Page (/route-plans/[id]/page.tsx)
Sections:
1. Header with actions (Edit, Assign, Generate Loads, Cancel)
2. Route Overview Map (RoutePlanPreviewMap)
3. Stop Details Table
4. Assignment Info (driver/truck or assign button)
5. Generated Loads Table with links
6. Metadata (created by, dates)

## 📊 Feature Completeness

| Category | Progress | Status |
|----------|----------|--------|
| Database Schema | 100% | ✅ Complete |
| Validation & Helpers | 100% | ✅ Complete |
| API Endpoints | 100% | ✅ Complete |
| Core Components | 50% | 🚧 In Progress |
| Pages | 0% | ⏳ Not Started |
| Integration | 0% | ⏳ Not Started |
| Mobile | 0% | ⏳ Not Started |

**Overall Progress: ~60%**

## 🧪 Testing Checklist

### Backend Testing (Ready to Test)
- [ ] Create route plan via API
- [ ] Assign to driver (verify notification sent)
- [ ] Generate loads manually
- [ ] Test cron job (run manually)
- [ ] Verify status transitions (DRAFT → SCHEDULED → ACTIVE → COMPLETED)
- [ ] Test duplicate prevention
- [ ] Test role-based access (DRIVER can only see their own)

### Frontend Testing (After Completion)
- [ ] Create route plan through wizard
- [ ] Landmark picker search and filter
- [ ] Weekday selection
- [ ] Stop management (add/remove/reorder)
- [ ] Assign modal
- [ ] Generate loads button
- [ ] Mobile responsive design
- [ ] Mobile app notification flow

## 🚀 Deployment Notes

1. **Environment Variables Required:**
   ```
   CRON_SECRET=<random-secret>  # For cron job authentication
   ```

2. **Vercel Cron:**
   - Already configured in `vercel.json`
   - Runs daily at 6:00 AM UTC
   - Generates loads 7 days ahead
   - Handles status transitions automatically

3. **Database:**
   - Migration already applied
   - Indexes created for performance
   - Ready for production

## 📝 API Documentation

### Create Route Plan
```bash
POST /api/route-plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "planName": "Sarajevo-Zagreb Tjedni Plan",
  "description": "Redovna sedmična ruta",
  "startDate": "2026-05-12T00:00:00Z",  # Monday
  "endDate": "2026-05-18T23:59:59Z",     # Sunday
  "daysOfWeek": ["MONDAY", "WEDNESDAY", "FRIDAY"],
  "cargoType": "LABUDICA",
  "distance": 450,
  "deadheadMiles": 50,
  "loadRate": 800,
  "estimatedDurationHours": 8,
  "stops": [
    {
      "type": "PICKUP",
      "sequence": 0,
      "landmarkId": "clxxx...",  # OR use customAddress
      "contactName": "John Doe",
      "contactPhone": "+387 61 234 567",
      "scheduledTimeOffset": 0  # Minutes from start
    },
    {
      "type": "DELIVERY",
      "sequence": 1,
      "landmarkId": "clyyy...",
      "contactName": "Jane Smith",
      "contactPhone": "+385 91 234 567",
      "scheduledTimeOffset": 480  # 8 hours later
    }
  ]
}
```

### Assign Route Plan
```bash
POST /api/route-plans/{id}/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "driverId": "clxxx...",
  "truckId": "clyyy...",
  "sendNotification": true
}
```

### Generate Loads
```bash
POST /api/route-plans/{id}/generate-loads
Authorization: Bearer <token>
Content-Type: application/json

{
  "startDate": "2026-05-12T00:00:00Z",  # Optional override
  "endDate": "2026-05-18T23:59:59Z"     # Optional override
}
```

## 🎯 Next Steps

1. **Immediate (High Priority):**
   - Create remaining components (RoutePlanStopForm, AssignRoutePlanModal, RoutePlanPreviewMap)
   - Build the list page
   - Build the detail page

2. **Short Term:**
   - Build the creation wizard
   - Integrate with existing pages
   - Test end-to-end flow

3. **Medium Term:**
   - Mobile app screen
   - Mobile notification handling
   - Performance optimization

4. **Long Term:**
   - Analytics/reporting for route plans
   - Bulk operations
   - Route optimization suggestions

## 💡 Implementation Tips

1. **Reuse Existing Patterns:**
   - Load wizard → Route plan wizard (similar structure)
   - Load detail page → Route plan detail page
   - Notification system already set up

2. **Map Components:**
   - Check existing map components in `/components/maps`
   - Reuse Leaflet setup from LiveMap/RouteReplayMap

3. **Forms:**
   - Use React Hook Form (if already in project)
   - Or simple useState management
   - Validate with Zod schemas before API calls

4. **Error Handling:**
   - Display API errors to users
   - Loading states on all async operations
   - Optimistic updates where appropriate

## 🐛 Known Considerations

1. **Time Zones:**
   - All dates stored in UTC
   - Frontend should convert to local time
   - Be careful with day boundaries

2. **Load Generation:**
   - Duplicate prevention is crucial
   - Test edge cases (plan spans multiple weeks)
   - Cron job should be idempotent

3. **Notifications:**
   - Handle case where driver has no push token
   - Log notification failures
   - Don't block assignment if notification fails

4. **Performance:**
   - Large route plans (many weeks) → paginate generated loads
   - Landmark picker → implement virtual scrolling if needed
   - Map with many stops → cluster markers

## 📚 Related Files

**Backend:**
- `prisma/schema.prisma` - Database models
- `lib/route-plan-helpers.ts` - Core logic
- `lib/validation/route-plan.ts` - Validation schemas
- `app/api/route-plans/**` - All API endpoints

**Frontend (Created):**
- `components/route-plans/RoutePlanStatusBadge.tsx`
- `components/route-plans/WeekDaySelector.tsx`
- `components/route-plans/LandmarkPicker.tsx`

**Frontend (To Create):**
- `components/route-plans/RoutePlanStopForm.tsx`
- `components/route-plans/AssignRoutePlanModal.tsx`
- `components/route-plans/RoutePlanPreviewMap.tsx`
- `app/(dashboard)/route-plans/page.tsx`
- `app/(dashboard)/route-plans/new/page.tsx`
- `app/(dashboard)/route-plans/[id]/page.tsx`

---

**Status:** Backend 100% complete, Frontend 30% complete
**Last Updated:** 2026-05-10
**Next Milestone:** Complete remaining UI components and pages
