# 🚛 Transport Management App

Kompletna aplikacija za upravljanje transportnom kompanijom (car hauler business).

## 📋 Features

### Dashboard & Analytics
- **Admin Dashboard** - KPIs, revenue trends, active loads, alerts
- **Driver Dashboard** - Current load, monthly stats, quick actions
- **Interactive Map** - Real-time visualization of active loads using Leaflet.js

### Core Management
- **User Management** - Admin, Dispatcher, Driver roles
- **Driver Management** - CDL tracking, medical cards, compliance, performance metrics
- **Truck Management** - Fleet tracking, maintenance schedules, capacity management
- **Load Management** - Complete lifecycle from assignment to completion
- **Document Management** - POD, BOL, damage reports, compliance docs

### Financial
- **Wage Calculations** - Automatic pay stub generation based on completed loads
- **Expense Tracking** - Fuel, tolls, repairs, maintenance
- **Revenue Reports** - Daily, weekly, monthly breakdown

### Alerts & Compliance
- **Smart Alerts System** - Tracks expiring documents, maintenance due, missing PODs
- **Compliance Monitoring** - CDL, medical cards, insurance, registration
- **Urgency Levels** - Urgent (red), Warning (yellow), Info (blue)

### Communication
- **Telegram Notifications** - Real-time alerts for load assignments, status changes, document uploads
- **Audit Logs** - Complete trail of all system actions

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Maps**: Leaflet.js + react-leaflet
- **Charts**: Recharts
- **Authentication**: JWT (HTTP-only cookies)
- **Notifications**: Telegram Bot API

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Telegram Bot (optional, for notifications)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd transport
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# JWT Secrets
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# Telegram (optional)
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_ADMIN_CHAT_ID="your-telegram-chat-id"

# File Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760

# App Config
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Schengen 90/180
SCHENGEN_GEOJSON_PATH="./data/schengen.geojson"
```

4. **Setup database**

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma db push

# (Optional) Seed initial data
npx prisma db seed
```

5. **Run development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Admin Account

After seeding, you can login with:
- **Email**: `admin@transport.com`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change this password immediately in production!

## 🛂 Schengen 90/180

### GeoJSON setup
Schengen kalkulacija koristi polygon granice iz `data/schengen.geojson`. Fajl možeš generisati iz globalnog `countries.geojson`:

```bash
python3 scripts/build-schengen-geojson.py /putanja/do/countries.geojson
```

### Pravilo (90/180)
- Nema resetovanja po “polugodištu”.
- U svakom trenutku se gleda **zadnjih 180 dana**.
- Ako je vozač bio u Schengenu **bilo koji dio dana**, taj dan se broji kao 1 dan.
- **Preostalo = 90 − (broj dana u Schengenu u zadnjih 180 dana)**.

### Ručni unos
- Ako nemaš historijske GPS podatke, možeš ručno unijeti **preostalo dana** i datum “as of”.
- Od tog datuma aplikacija oduzima nove Schengen dane kako se pojavljuju GPS pozicije.

## 📁 Project Structure

```
transport/
├── app/
│   ├── (auth)/          # Authentication pages (login)
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── drivers/     # Driver management
│   │   ├── trucks/      # Truck management
│   │   ├── loads/       # Load management
│   │   ├── documents/   # Document management
│   │   ├── wages/       # Wage/pay stub management
│   │   ├── reports/     # Revenue & expense reports
│   │   ├── alerts/      # Alerts system
│   │   ├── audit-logs/  # Audit log viewer
│   │   └── users/       # User management
│   └── api/             # API routes
├── components/
│   ├── dashboard/       # Dashboard-specific components
│   ├── documents/       # Document upload/viewer
│   ├── layout/          # Layout components (Sidebar, Header)
│   ├── performance/     # Performance charts
│   └── ui/              # Reusable UI components (shadcn/ui)
├── lib/
│   ├── auth.ts          # JWT authentication
│   ├── authContext.tsx  # Auth context provider
│   ├── auditLog.ts      # Audit logging helpers
│   ├── fileUpload.ts    # File upload handling
│   ├── prisma.ts        # Prisma client
│   └── telegram.ts      # Telegram notification helpers
├── prisma/
│   └── schema.prisma    # Database schema
└── middleware.ts        # CORS, rate limiting, security headers
```

## 🔐 Security Features

- **JWT Authentication** with HTTP-only cookies
- **Role-Based Access Control** (ADMIN, DISPATCHER, DRIVER)
- **Rate Limiting** - 100 requests per minute per IP
- **CORS Protection** - Configured allowed origins
- **Security Headers** - XSS, MIME-sniffing, clickjacking protection
- **File Upload Validation** - Type and size restrictions
- **Audit Logging** - Complete trail of all actions

## 🗄️ Database Schema

Key models:
- **User** - Authentication & profile
- **Driver** - Driver info, CDL, medical cards
- **Truck** - Fleet vehicles, capacity, registration
- **Load** - Shipments with pickup/delivery details
- **Vehicle** - Cars being transported in loads
- **Document** - All uploaded files (POD, BOL, etc.)
- **PayStub** - Generated wage statements
- **MaintenanceRecord** - Truck maintenance history
- **AuditLog** - System action tracking

See `prisma/schema.prisma` for complete schema.

## 📱 Telegram Bot Setup

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your bot token
3. Send a message to your bot
4. Get your chat ID from: `https://api.telegram.org/bot<TOKEN>/getUpdates`
5. Add both to `.env` file

**Notifications sent for:**
- Load assignments
- Status changes
- Document uploads
- Compliance alerts
- Maintenance reminders

## 🚀 Deployment

### Production Checklist

- [ ] Update `NEXT_PUBLIC_APP_URL` in `.env`
- [ ] Change default admin password
- [ ] Setup production database (Neon, Supabase, etc.)
- [ ] Configure allowed CORS origins in `middleware.ts`
- [ ] Setup SSL certificate
- [ ] Configure backup strategy
- [ ] Test all critical flows
- [ ] Monitor error logs

### Vercel Deployment

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Self-Hosted Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

3. Use PM2 for process management:
```bash
pm2 start npm --name "transport-app" -- start
pm2 save
pm2 startup
```

## 📊 Key Features by Role

### Admin
- Full system access
- User & driver management
- Financial reports
- Alerts & compliance monitoring
- Audit log access
- System configuration

### Dispatcher
- View all drivers & trucks
- Create & assign loads
- Monitor load status
- View reports
- Upload documents

### Driver
- View assigned loads
- Update load status (Picked Up, In Transit, Delivered)
- Upload POD documents
- View monthly earnings
- Track performance metrics

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
```

### Prisma Client Issues
```bash
# Regenerate client
npx prisma generate
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## 📝 License

Proprietary - All rights reserved

## 👥 Support

For issues or questions, contact: emir@transport.com

---

**Built with ❤️ for efficient transport management**
