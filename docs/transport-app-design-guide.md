# Transport Management App - Design Guide

## 📋 Overview

Ovaj dokument definiše kompletan design system za Transport Management aplikaciju, baziran na modernom, clean UI/UX pristupu sa fokusom na data visualization i user experience.

---

## 🎨 COLOR PALETTE

### Primary Colors

```css
/* Primary Blue - Glavni brand color */
--primary-50: #f0f9ff;
--primary-100: #e0f2fe;
--primary-200: #bae6fd;
--primary-300: #7dd3fc;
--primary-400: #38bdf8;
--primary-500: #0ea5e9;  /* Main Primary */
--primary-600: #0284c7;
--primary-700: #0369a1;
--primary-800: #075985;
--primary-900: #0c4a6e;
```

### Dark/Neutral Colors

```css
/* Dark Scale - Za sidebar, text, backgrounds */
--dark-50: #f8fafc;   /* Lightest background */
--dark-100: #f1f5f9;  /* Light background */
--dark-200: #e2e8f0;  /* Borders, dividers */
--dark-300: #cbd5e1;
--dark-400: #94a3b8;  /* Secondary text */
--dark-500: #64748b;  /* Muted text */
--dark-600: #475569;
--dark-700: #334155;  /* Dark text */
--dark-800: #1e293b;  /* Sidebar background */
--dark-900: #0f172a;  /* Darkest */
```

### Semantic Colors

```css
/* Success / Growth */
--success-50: #f0fdf4;
--success-500: #10b981;  /* Main success color */
--success-700: #047857;

/* Warning */
--warning-50: #fffbeb;
--warning-500: #f59e0b;  /* Main warning color */
--warning-700: #b45309;

/* Danger / Error */
--danger-50: #fef2f2;
--danger-500: #ef4444;   /* Main danger color */
--danger-700: #b91c1c;

/* Info */
--info-50: #ecfeff;
--info-500: #06b6d4;     /* Main info color */
--info-700: #0e7490;
```

### Usage Guidelines

**Primary Blue (`#0ea5e9`):**
- Call-to-action buttons
- Active navigation items
- Links
- Data visualization highlights
- Progress indicators

**Dark Colors:**
- Sidebar: `#1e293b`
- Main text: `#334155`
- Secondary text: `#64748b`
- Muted text: `#94a3b8`
- Background: `#f8fafc`

**Status Colors:**
- Active/Success: Green `#10b981`
- Warning/Pending: Yellow `#f59e0b`
- Error/Urgent: Red `#ef4444`
- Info/In-Transit: Cyan `#06b6d4`

---

## 📝 TYPOGRAPHY

### Font Family

```css
font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
```

**Installation:**
```bash
npm install @fontsource/inter
```

**Import in app:**
```tsx
// app/layout.tsx
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
```

### Font Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| Hero Title | 36px | 700 (Bold) | 1.2 | Page titles, main headings |
| H1 | 32px | 700 | 1.2 | Section headings |
| H2 | 24px | 600 (Semi-Bold) | 1.3 | Subsection headings |
| H3 | 20px | 600 | 1.4 | Card titles |
| H4 | 18px | 600 | 1.4 | Small headings |
| Body Large | 16px | 400 (Regular) | 1.6 | Important body text |
| Body | 14px | 400 | 1.6 | Standard body text |
| Small | 13px | 500 (Medium) | 1.5 | Labels, captions |
| Tiny | 12px | 500 | 1.4 | Meta info, timestamps |
| Micro | 11px | 400 | 1.3 | Footnotes |

### Typography Examples

```css
/* Hero Title */
.hero-title {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--dark-900);
  letter-spacing: -0.02em; /* Tight for large text */
}

/* Body Text */
.body-text {
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--dark-700);
}

/* Label */
.label-text {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dark-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

---

## 📐 LAYOUT & SPACING

### Grid System

**12-Column Grid:**
- Container max-width: `1440px`
- Column gap: `24px`
- Row gap: `24px`

**Responsive Breakpoints:**
```css
/* Tailwind default breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Laptop */
xl: 1280px  /* Desktop */
2xl: 1536px /* Large desktop */
```

### Spacing Scale

Koristi Tailwind spacing scale:

```
0: 0px
px: 1px
0.5: 2px
1: 4px
2: 8px
3: 12px
4: 16px
5: 20px
6: 24px
7: 28px
8: 32px
10: 40px
12: 48px
16: 64px
20: 80px
24: 96px
```

**Usage Guidelines:**
- Card padding: `6` (24px)
- Section spacing: `8` (32px)
- Element gaps: `4` (16px)
- Tight spacing: `2` (8px)

### Main Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ Sidebar (280px)  │ Main Content (flexible)               │
│ Fixed/Sticky     │ Scrollable                            │
│                  │                                        │
│                  │ ┌─ Header (72px, sticky) ────────────┐│
│                  │ │ Search, Notifications, User        ││
│                  │ └────────────────────────────────────┘│
│                  │                                        │
│                  │ ┌─ Content Area (padding: 48px) ────┐│
│                  │ │                                    ││
│                  │ │  Breadcrumbs                       ││
│                  │ │  Page Title                        ││
│                  │ │                                    ││
│                  │ │  [Content Grid/Cards]              ││
│                  │ │                                    ││
│                  │ └────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Sidebar:**
- Width: `280px` (desktop)
- Collapsed width: `80px`
- Background: `#1e293b`
- Fixed position on desktop
- Off-canvas drawer on mobile

**Main Content:**
- Max-width: `1440px`
- Padding: `48px` (desktop), `24px` (mobile)
- Background: `#f8fafc`

**Header:**
- Height: `72px`
- Background: White
- Box-shadow: `0 1px 3px rgba(0,0,0,0.08)`
- Sticky on scroll

---

## 🎯 COMPONENTS

### 1. Buttons

#### Primary Button

```css
.btn-primary {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(14, 165, 233, 0.35);
}

.btn-primary:active {
  transform: translateY(0);
}
```

#### Secondary Button

```css
.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}
```

#### Button Sizes

**Small:**
```css
padding: 8px 16px;
font-size: 13px;
border-radius: 10px;
```

**Medium (default):**
```css
padding: 12px 24px;
font-size: 14px;
border-radius: 12px;
```

**Large:**
```css
padding: 16px 32px;
font-size: 16px;
border-radius: 14px;
```

#### Icon Buttons

```css
.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
}
```

---

### 2. Cards

#### Base Card Style

```css
.card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
```

#### Card Variants

**Stat Card (KPI Card):**
```html
<div class="card">
  <div class="flex items-center gap-3 mb-3">
    <div class="text-2xl text-primary-500">🚛</div>
    <span class="text-sm text-gray-500 font-medium">Active Loads</span>
  </div>
  
  <div class="text-3xl font-bold text-gray-900 mb-2">12</div>
  
  <!-- Dot Matrix or Progress Bar -->
  <div class="mb-3">[Visualization]</div>
  
  <div class="text-sm font-medium text-green-600 flex items-center gap-1">
    <span>↗</span> +12% vs last month
  </div>
</div>
```

**Info Card:**
```html
<div class="card">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900">Driver: John Doe</h3>
    <button class="text-primary-500 text-sm font-medium">Edit</button>
  </div>
  
  <div class="space-y-3">
    <div class="flex items-center gap-2">
      <span class="text-gray-500">📍 Status:</span>
      <span class="font-medium">Active</span>
    </div>
    <!-- More info rows -->
  </div>
</div>
```

---

### 3. Sidebar Navigation

#### Structure

```html
<aside class="w-[280px] h-screen bg-dark-800 text-gray-400 fixed left-0 top-0">
  <!-- Logo -->
  <div class="p-6">
    <div class="flex items-center gap-3">
      <div class="text-2xl">🚛</div>
      <span class="text-white font-bold text-lg">TransportApp</span>
    </div>
  </div>
  
  <!-- Navigation -->
  <nav class="px-3">
    <!-- Section: HOME -->
    <div class="mb-6">
      <div class="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Home
      </div>
      
      <!-- Active Item -->
      <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-dark-700 text-white">
        <span class="text-lg">📊</span>
        <span class="font-medium">Overview</span>
        <span class="ml-auto w-2 h-2 rounded-full bg-primary-500"></span>
      </a>
      
      <!-- Regular Item -->
      <a href="#" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-dark-700 transition-colors">
        <span class="text-lg">👥</span>
        <span class="font-medium">Drivers</span>
      </a>
    </div>
  </nav>
</aside>
```

#### Navigation States

**Active:**
```css
background: var(--dark-700);
color: white;
/* Blue dot indicator on right */
```

**Hover:**
```css
background: var(--dark-700);
transition: background 0.2s ease;
```

**Icon Size:** `20px` (use Lucide React icons)

---

### 4. Forms & Inputs

#### Text Input

```css
.input {
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  color: #334155;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #0ea5e9;
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
  cursor: not-allowed;
}
```

#### Label

```css
.label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
}
```

#### Select Dropdown

```css
.select {
  /* Same as .input */
  appearance: none;
  background-image: url("data:image/svg+xml,..."); /* Chevron down icon */
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}
```

#### Date Picker

```css
.date-picker {
  /* Same as .input */
  background-image: url("data:image/svg+xml,..."); /* Calendar icon */
  background-repeat: no-repeat;
  background-position: left 12px center;
  padding-left: 40px;
}
```

#### Form Layout

```html
<form class="space-y-6">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label class="label">First Name</label>
      <input type="text" class="input" />
    </div>
    
    <div>
      <label class="label">Last Name</label>
      <input type="text" class="input" />
    </div>
  </div>
  
  <!-- More fields -->
  
  <div class="flex gap-3 justify-end">
    <button type="button" class="btn-secondary">Cancel</button>
    <button type="submit" class="btn-primary">Save Changes</button>
  </div>
</form>
```

---

### 5. Tables / Data Grids

#### Table Structure

```html
<div class="card p-0 overflow-hidden">
  <table class="w-full">
    <thead class="bg-gray-50 border-b border-gray-200">
      <tr>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Name
        </th>
        <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Status
        </th>
        <th class="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
    
    <tbody class="divide-y divide-gray-200">
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4 text-sm text-gray-900">John Doe</td>
        <td class="px-6 py-4">
          <span class="status-badge status-active">Active</span>
        </td>
        <td class="px-6 py-4 text-right">
          <button class="text-primary-500 text-sm font-medium">Edit</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Table Styles

```css
/* No vertical borders */
table {
  border-collapse: collapse;
}

/* Alternating rows (optional) */
tbody tr:nth-child(even) {
  background: #fafbfc;
}

/* Hover effect */
tbody tr:hover {
  background: #f1f5f9;
}
```

---

### 6. Badges / Tags

#### Status Badge

```html
<!-- Active -->
<span class="status-badge status-active">
  <span class="status-dot"></span>
  Active
</span>

<!-- Completed -->
<span class="status-badge status-completed">
  <span class="status-dot"></span>
  Completed
</span>
```

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px; /* Pill shape */
  font-size: 12px;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Variants */
.status-active {
  background: #d1fae5;
  color: #065f46;
}
.status-active .status-dot {
  background: #10b981;
}

.status-vacation {
  background: #fef3c7;
  color: #92400e;
}
.status-vacation .status-dot {
  background: #f59e0b;
}

.status-sick {
  background: #fed7aa;
  color: #9a3412;
}
.status-sick .status-dot {
  background: #f97316;
}

.status-completed {
  background: #dbeafe;
  color: #1e3a8a;
}
.status-completed .status-dot {
  background: #3b82f6;
}
```

---

### 7. Dot Matrix Visualization

**Concept:**
Vizualizacija data pomoću grida od malih krugova (dots). Popunjeni dots = active/completed, prazni = inactive.

#### Implementation

```tsx
// components/ui/dot-matrix.tsx
interface DotMatrixProps {
  data: number[]; // Array of values (0-100)
  cols?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function DotMatrix({ data, cols = 10, size = 'md' }: DotMatrixProps) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };
  
  return (
    <div 
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {data.map((value, i) => (
        <div
          key={i}
          className={`
            ${dotSizes[size]} 
            rounded-full 
            transition-all duration-200
            ${value > 50 ? 'bg-primary-500' : 'bg-gray-200'}
          `}
        />
      ))}
    </div>
  );
}
```

#### Usage Examples

**Driver Activity (30 days):**
```tsx
// Svaki dot = 1 dan
// Popunjen = aktivan dan, prazan = neaktivan
<DotMatrix 
  data={last30DaysActivity} 
  cols={10} 
  size="sm"
/>
```

**Truck Utilization:**
```tsx
// Vizualizacija load completion rate
<DotMatrix 
  data={utilizationData} 
  cols={12} 
  size="md"
/>
```

---

### 8. Charts

#### Mini Line Chart (Trend Indicator)

```tsx
// components/ui/mini-chart.tsx
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export function MiniChart({ data }: { data: number[] }) {
  const chartData = data.map((value, index) => ({ value, index }));
  
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#0ea5e9" 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### Chart Styling Guidelines

**Colors:**
- Primary line: `#0ea5e9`
- Secondary line: `#64748b`
- Grid lines: `#e2e8f0` (very subtle or none)
- Background: Transparent

**Fonts:**
- Axis labels: 12px, gray-500
- Tooltip: 14px, dark-900

**Spacing:**
- No excessive padding
- Minimal gridlines
- Clean, modern look

---

### 9. Modals / Dialogs

#### Modal Structure

```html
<div class="modal-overlay">
  <div class="modal-content">
    <!-- Header -->
    <div class="modal-header">
      <h3 class="text-xl font-semibold text-gray-900">Modal Title</h3>
      <button class="modal-close">✕</button>
    </div>
    
    <!-- Body -->
    <div class="modal-body">
      <p>Modal content goes here...</p>
    </div>
    
    <!-- Footer -->
    <div class="modal-footer">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

#### Modal Styles

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
```

---

### 10. Notifications / Toasts

#### Toast Position

```css
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

#### Toast Variants

```css
.toast {
  min-width: 300px;
  padding: 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 12px;
  align-items: start;
}

.toast-success {
  border-left: 4px solid #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-warning {
  border-left: 4px solid #f59e0b;
}

.toast-info {
  border-left: 4px solid #0ea5e9;
}
```

---

## 🎨 CUSTOM COMPONENTS

### 1. StatCard Component

```tsx
// components/dashboard/stat-card.tsx
import { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  visualization?: ReactNode;
}

export function StatCard({ 
  icon, 
  label, 
  value, 
  trend, 
  trendLabel,
  visualization 
}: StatCardProps) {
  const isPositive = trend && trend > 0;
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-soft-lg transition-all hover:-translate-y-1">
      {/* Icon & Label */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-primary-500 text-2xl">{icon}</div>
        <div className="text-sm text-gray-500 font-medium">{label}</div>
      </div>
      
      {/* Value */}
      <div className="text-3xl font-bold text-gray-900 mb-2">{value}</div>
      
      {/* Visualization (Dot Matrix, Progress Bar, etc.) */}
      {visualization && (
        <div className="mb-3">{visualization}</div>
      )}
      
      {/* Trend */}
      {trend !== undefined && (
        <div className={`text-sm font-medium flex items-center gap-1 ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <span>{isPositive ? '↗' : '↘'}</span>
          <span>{Math.abs(trend)}%</span>
          {trendLabel && <span className="text-gray-500">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}
```

**Usage:**
```tsx
<StatCard
  icon={<TruckIcon />}
  label="Active Loads"
  value={12}
  trend={12}
  trendLabel="vs last month"
  visualization={<DotMatrix data={loadData} cols={10} />}
/>
```

---

### 2. StatusBadge Component

```tsx
// components/ui/status-badge.tsx
type Status = 
  | 'active' 
  | 'inactive' 
  | 'vacation' 
  | 'sick' 
  | 'available' 
  | 'assigned'
  | 'in-transit' 
  | 'delivered'
  | 'completed';

const statusConfig = {
  active: { 
    color: 'bg-green-100 text-green-700 border-green-200', 
    dot: 'bg-green-500',
    label: 'Active'
  },
  inactive: { 
    color: 'bg-gray-100 text-gray-700 border-gray-200', 
    dot: 'bg-gray-500',
    label: 'Inactive'
  },
  vacation: { 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200', 
    dot: 'bg-yellow-500',
    label: 'Vacation'
  },
  sick: { 
    color: 'bg-orange-100 text-orange-700 border-orange-200', 
    dot: 'bg-orange-500',
    label: 'Sick Leave'
  },
  available: { 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    dot: 'bg-blue-500',
    label: 'Available'
  },
  assigned: { 
    color: 'bg-purple-100 text-purple-700 border-purple-200', 
    dot: 'bg-purple-500',
    label: 'Assigned'
  },
  'in-transit': { 
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200', 
    dot: 'bg-cyan-500',
    label: 'In Transit'
  },
  delivered: { 
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200', 
    dot: 'bg-indigo-500',
    label: 'Delivered'
  },
  completed: { 
    color: 'bg-green-100 text-green-700 border-green-200', 
    dot: 'bg-green-500',
    label: 'Completed'
  },
};

interface StatusBadgeProps {
  status: Status;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span 
      className={`
        inline-flex items-center gap-2 
        px-3 py-1.5 
        rounded-full 
        text-xs font-semibold 
        border
        ${config.color}
      `}
    >
      {showDot && (
        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      )}
      {config.label}
    </span>
  );
}
```

---

### 3. CapacityIndicator Component

```tsx
// components/trucks/capacity-indicator.tsx
interface CapacityIndicatorProps {
  current: number;
  max: number;
  label?: string;
}

export function CapacityIndicator({ current, max, label }: CapacityIndicatorProps) {
  const percentage = Math.round((current / max) * 100);
  
  // Color based on percentage
  const getColor = () => {
    if (percentage < 70) return 'bg-green-500';
    if (percentage < 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getTextColor = () => {
    if (percentage < 70) return 'text-green-700';
    if (percentage < 90) return 'text-yellow-700';
    return 'text-red-700';
  };
  
  return (
    <div>
      {label && (
        <div className="text-sm text-gray-600 mb-2 flex justify-between">
          <span>{label}</span>
          <span className={`font-semibold ${getTextColor()}`}>
            {current}/{max} ({percentage}%)
          </span>
        </div>
      )}
      
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

**Usage:**
```tsx
<CapacityIndicator 
  current={6} 
  max={8} 
  label="Small Cars"
/>
```

---

### 4. LoadTimeline Component

```tsx
// components/loads/load-timeline.tsx
interface TimelineItem {
  status: string;
  timestamp?: string;
  location?: string;
  completed: boolean;
}

interface LoadTimelineProps {
  items: TimelineItem[];
}

export function LoadTimeline({ items }: LoadTimelineProps) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex gap-4">
          {/* Icon/Dot */}
          <div className="flex flex-col items-center">
            <div 
              className={`
                w-3 h-3 rounded-full 
                ${item.completed ? 'bg-primary-500' : 'bg-gray-300'}
              `}
            />
            {index < items.length - 1 && (
              <div 
                className={`
                  w-0.5 h-full mt-2
                  ${item.completed ? 'bg-primary-200' : 'bg-gray-200'}
                `}
              />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 pb-8">
            <div className="flex justify-between items-start mb-1">
              <span 
                className={`
                  font-medium 
                  ${item.completed ? 'text-gray-900' : 'text-gray-500'}
                `}
              >
                {item.status}
              </span>
              {item.timestamp && (
                <span className="text-sm text-gray-500">{item.timestamp}</span>
              )}
            </div>
            
            {item.location && (
              <div className="text-sm text-gray-600">
                📍 {item.location}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 🛠️ TAILWIND CONFIGURATION

### Complete tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Blue
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Dark/Neutral Scale
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Semantic colors (using Tailwind defaults but can override)
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'soft-xl': '0 10px 25px rgba(0, 0, 0, 0.1)',
        'primary': '0 4px 12px rgba(14, 165, 233, 0.25)',
        'primary-lg': '0 6px 20px rgba(14, 165, 233, 0.35)',
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 📦 REQUIRED PACKAGES

### Installation Commands

```bash
# Core dependencies
npm install @fontsource/inter
npm install lucide-react
npm install recharts
npm install clsx tailwind-merge

# shadcn/ui components
npx shadcn-ui@latest init
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add calendar
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add tooltip

# Date picker
npm install react-day-picker date-fns

# Forms
npm install react-hook-form @hookform/resolvers zod
```

---

## 🎯 IMPLEMENTATION CHECKLIST

### Phase 1: Setup
- [ ] Install Inter font
- [ ] Configure Tailwind with custom theme
- [ ] Install Lucide React icons
- [ ] Install shadcn/ui components
- [ ] Setup folder structure for components

### Phase 2: Core Components
- [ ] Create base Card component
- [ ] Create Button variants (primary, secondary, icon)
- [ ] Create Input components
- [ ] Create StatusBadge component
- [ ] Create DotMatrix component
- [ ] Create StatCard component

### Phase 3: Layout
- [ ] Implement Sidebar navigation
- [ ] Create Header component
- [ ] Setup main layout structure
- [ ] Add breadcrumbs
- [ ] Implement responsive behavior

### Phase 4: Data Display
- [ ] Create DataTable component
- [ ] Implement CapacityIndicator
- [ ] Create LoadTimeline component
- [ ] Setup chart components (Recharts)
- [ ] Add loading skeletons

### Phase 5: Forms
- [ ] Create form layouts
- [ ] Add validation styling
- [ ] Implement multi-step forms
- [ ] Add date pickers
- [ ] Create select dropdowns

### Phase 6: Feedback
- [ ] Implement toast notifications
- [ ] Create modal/dialog components
- [ ] Add confirmation dialogs
- [ ] Setup loading states
- [ ] Add empty states

---

## 💡 DESIGN PRINCIPLES

### 1. Consistency
- Use spacing scale consistently
- Maintain color palette across all components
- Keep border-radius consistent (12px-20px)
- Use same shadow styles

### 2. Hierarchy
- Clear visual hierarchy with typography scale
- Important elements larger/bolder
- Use color to indicate importance
- White space for separation

### 3. Feedback
- Hover states on interactive elements
- Loading states for async actions
- Success/error notifications
- Disabled states clearly visible

### 4. Accessibility
- Color contrast ratio > 4.5:1
- Focus indicators on all interactive elements
- ARIA labels where needed
- Keyboard navigation support

### 5. Performance
- Optimize images
- Lazy load heavy components
- Use React.memo for expensive renders
- Minimize re-renders

---

## 📱 RESPONSIVE DESIGN

### Breakpoint Strategy

**Desktop (1024px+):**
- Full sidebar visible
- Multi-column grids
- Larger cards
- All features visible

**Tablet (768px - 1023px):**
- Collapsible sidebar
- 2-column grids
- Slightly smaller cards
- Some features in dropdowns

**Mobile (<768px):**
- Off-canvas sidebar (drawer)
- Single column
- Stacked cards
- Bottom navigation (optional)
- Touch-optimized (min 44px touch targets)

### Example Responsive Classes

```tsx
<div className="
  grid 
  grid-cols-1           /* Mobile: 1 column */
  md:grid-cols-2        /* Tablet: 2 columns */
  lg:grid-cols-4        /* Desktop: 4 columns */
  gap-4 md:gap-6        /* Responsive gap */
">
  {/* Cards */}
</div>
```

---

## 🎨 SAMPLE PAGES

### Dashboard

```tsx
// app/(dashboard)/page.tsx
export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's your overview.</p>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<TruckIcon />}
          label="Active Loads"
          value={12}
          trend={12}
          trendLabel="vs last month"
          visualization={<DotMatrix data={[...]} />}
        />
        {/* More stat cards */}
      </div>
      
      {/* Map View */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Active Loads Map</h2>
        <div className="h-96 bg-gray-100 rounded-xl">
          {/* Map component */}
        </div>
      </Card>
      
      {/* Alerts & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Alerts</h3>
          {/* Alerts list */}
        </Card>
        
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
          {/* Chart */}
        </Card>
      </div>
    </div>
  );
}
```

### Driver List

```tsx
// app/(dashboard)/drivers/page.tsx
export default function DriversPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-500">Manage your driver fleet</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Driver
        </Button>
      </div>
      
      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <Input 
            placeholder="Search drivers..." 
            className="max-w-sm"
          />
          <Select>
            <option>All Status</option>
            <option>Active</option>
            <option>Vacation</option>
            <option>Sick</option>
          </Select>
        </div>
      </Card>
      
      {/* Table */}
      <Card>
        <Table>
          {/* Table content */}
        </Table>
      </Card>
    </div>
  );
}
```

---

## 🚀 NEXT STEPS

1. **Start with Setup:**
   - Install all required packages
   - Configure Tailwind
   - Setup folder structure

2. **Build Core Components:**
   - Start with atomic components (Button, Input, Badge)
   - Move to composite components (StatCard, Table)
   - Create layout components (Sidebar, Header)

3. **Implement Pages:**
   - Dashboard first (showcase all components)
   - Then CRUD pages (Drivers, Trucks, Loads)
   - Finally complex pages (Reports, Analytics)

4. **Polish & Refine:**
   - Add animations
   - Optimize performance
   - Test responsive design
   - Accessibility audit

---

## 📚 RESOURCES

**Design Inspiration:**
- Dribbble: [dribbble.com/tags/dashboard](https://dribbble.com/tags/dashboard)
- Behance: Financial/SaaS dashboards
- Real apps: Linear, Stripe Dashboard, Vercel

**Component Libraries:**
- shadcn/ui: [ui.shadcn.com](https://ui.shadcn.com)
- Tailwind UI: [tailwindui.com](https://tailwindui.com)
- Headless UI: [headlessui.com](https://headlessui.com)

**Icons:**
- Lucide: [lucide.dev](https://lucide.dev)
- Heroicons: [heroicons.com](https://heroicons.com)

**Fonts:**
- Google Fonts: [fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter)

**Colors:**
- Tailwind Colors: [tailwindcss.com/docs/customizing-colors](https://tailwindcss.com/docs/customizing-colors)
- Color Hunt: [colorhunt.co](https://colorhunt.co)

---

*Design Guide Version: 1.0*  
*Last Updated: December 2024*  
*Za pitanja ili dodatne detalje, konsultuj development team.*
