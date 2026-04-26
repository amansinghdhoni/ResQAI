# ResQAI — Full Platform Implementation Plan

## Current State Analysis

The existing codebase has a basic Vite + React scaffold with:
- ✅ Firebase Auth + Firestore config (working)
- ✅ Basic Auth page (Login/Signup with role selection)
- ✅ Basic Dashboard page (citizen/ngo/volunteer stubs)
- ✅ Basic Admin Dashboard (incident list, NGO assignment)
- ✅ Map component (Leaflet + OSM, severity-colored pins)
- ✅ Design system foundation in `index.css` (colors, glass panels, cards, buttons)

**What's missing or incomplete:**
- ❌ No volunteer task management (assign/view/complete tasks)
- ❌ No NGO self-assignment to incidents
- ❌ No NGO inventory management (update food/clothes/supplies)
- ❌ No volunteer-NGO linking
- ❌ No donation tab/page
- ❌ No phone/location fields in signup
- ❌ Dashboard UI is functional but not premium — needs a significant visual upgrade
- ❌ No tab-based navigation within dashboards
- ❌ No notifications system beyond the floating banner
- ❌ Admin can't see volunteer counts per NGO
- ❌ No citizen "register as volunteer" flow
- ❌ No proper auth state persistence (page refresh loses context)
- ❌ SEO metadata missing

---

## Proposed Changes

The entire platform will be rebuilt with a **premium dark-mode glassmorphism UI** while preserving the existing Firebase config and core data logic. Every file below is either new or significantly modified.

---

### Design System — Complete Overhaul

#### [MODIFY] [index.css](file:///f:/ResQAI/src/index.css)

Complete rewrite of the design system:
- **Dark mode** with deep navy/charcoal backgrounds (`#0B1120`, `#111827`)
- **Glassmorphism** cards with `backdrop-filter: blur()` and translucent borders
- **Gradient accents**: Primary gradient `linear-gradient(135deg, #3B82F6, #8B5CF6)` (blue→violet)
- **Severity color system**: Red→Orange→Yellow→Green spectrum
- **Premium typography**: Inter font, proper scale
- **Micro-animations**: Fade-ins, hover lifts, pulse effects, shimmer loading states
- **Full responsive grid** utilities
- **Tab navigation** styles
- **Modal overlay** styles with blur backdrop
- **Badge/pill** component styles
- **Progress bar** styles for severity visualization
- **Toast notification** animation system
- **Sidebar** layout with collapsible sections
- **Stat card** component with gradient borders

---

### Entry Point & SEO

#### [MODIFY] [index.html](file:///f:/ResQAI/index.html)

- Add proper `<title>`, meta description, Open Graph tags
- Add Leaflet CSS CDN link
- Add Google Fonts preconnect for Inter

---

### Auth Context (New)

#### [NEW] [AuthContext.jsx](file:///f:/ResQAI/src/contexts/AuthContext.jsx)

- React Context + Provider that wraps the app
- Listens to `onAuthStateChanged` globally
- Fetches and caches the user's Firestore document (role, name, etc.)
- Exposes `{ user, userData, loading, logout }` to all components
- Eliminates duplicate auth listeners across pages

---

### App Router

#### [MODIFY] [App.jsx](file:///f:/ResQAI/src/App.jsx)

- Wrap everything in `<AuthProvider>`
- Add protected route logic (redirect to `/` if not logged in)
- Add role-based routing guards (admin-only for `/admin`)

---

### Auth Page — Premium Redesign

#### [MODIFY] [Auth.jsx](file:///f:/ResQAI/src/pages/Auth.jsx)

- Full visual redesign with **split-screen layout**: left side = animated hero/branding, right side = auth form
- Add **phone number** field for all signups
- Add **city/location** field for all signups  
- Add **NGO address**, **contact person** fields for NGO signup
- Add **availability**, **age** fields for volunteer signup
- Animated tab switching between Login and Sign Up
- Proper error display with icons
- Loading spinner animation on submit
- The admin signup option is completely hidden — admin can only log in

---

### Dashboard — Complete Rebuild with Tabs

#### [MODIFY] [Dashboard.jsx](file:///f:/ResQAI/src/pages/Dashboard.jsx)

Complete rebuild into a **tabbed dashboard** that adapts based on role:

**Citizen Dashboard Tabs:**
1. **🗺️ Map** — Interactive map with click-to-report, live incident markers
2. **📋 My Reports** — History of citizen's own reports
3. **💰 Donate** — Donation form UI (amount, cause selection)
4. **🤝 Volunteer** — Option to register as volunteer

**NGO Dashboard Tabs:**
1. **🗺️ Map** — View all incidents, click to self-assign
2. **📦 Inventory** — Manage food/clothes/supplies/medical counts with +/- controls
3. **👥 Volunteers** — View linked volunteers, assign tasks per incident
4. **📋 Assignments** — View assigned incidents, mark "Situation Under Control"
5. **💰 Donations** — View donation pool

**Volunteer Dashboard Tabs:**
1. **🗺️ Map** — View assigned incident locations
2. **📋 My Tasks** — View assigned tasks, mark complete
3. **📊 Profile** — View skills, linked NGO

---

### Admin Dashboard — Full Rebuild

#### [MODIFY] [AdminDashboard.jsx](file:///f:/ResQAI/src/pages/AdminDashboard.jsx)

Complete rebuild with **command center** aesthetic:

**Admin Dashboard Tabs:**
1. **🗺️ Command Map** — Full incident map with severity heat indicators
2. **🚨 Incidents** — List all incidents, assign NGOs, view severity progress bar
3. **🏢 NGOs** — View all NGOs with inventory, volunteer counts, assignment status
4. **👥 Volunteers** — View all volunteers across all NGOs
5. **📊 Overview** — Stats cards (total incidents, active, resolved, total NGOs, total volunteers)

---

### Map Component — Enhanced

#### [MODIFY] [Map.jsx](file:///f:/ResQAI/src/components/Map.jsx)

- Add **pulsating** animation to high-severity markers
- Enhanced popups with more info (assigned NGOs count, resolution progress)
- Cluster support for areas with many incidents
- Custom map styling (dark-toned tiles from CartoDB for dark mode)
- "Self-assign" button directly in NGO popup view

---

### New Shared Components

#### [NEW] [Navbar.jsx](file:///f:/ResQAI/src/components/Navbar.jsx)
- Reusable navbar with role badge, notification bell icon, logout
- Animated notification counter

#### [NEW] [TabBar.jsx](file:///f:/ResQAI/src/components/TabBar.jsx)
- Reusable horizontal tab navigation with animated active indicator
- Icon + text tabs

#### [NEW] [StatCard.jsx](file:///f:/ResQAI/src/components/StatCard.jsx)
- Gradient-bordered card showing a stat number + label + icon
- Used in Admin overview and NGO inventory

#### [NEW] [Modal.jsx](file:///f:/ResQAI/src/components/Modal.jsx)
- Reusable modal overlay with blur backdrop, slide-in animation
- Used for report form, task assignment, donation

#### [NEW] [SeverityBar.jsx](file:///f:/ResQAI/src/components/SeverityBar.jsx)
- Animated progress bar that changes color based on severity %
- Shows gradient from red (100%) → green (0%)

#### [NEW] [FloatingAlert.jsx](file:///f:/ResQAI/src/components/FloatingAlert.jsx)
- Pulsating top banner for severe incident alerts
- Auto-dismiss with close button
- Stacks multiple alerts

#### [NEW] [TaskCard.jsx](file:///f:/ResQAI/src/components/TaskCard.jsx)
- Card showing task description, assigned volunteer, status badge
- "Mark Complete" button with confirmation

#### [NEW] [DonationForm.jsx](file:///f:/ResQAI/src/components/DonationForm.jsx)
- Amount selection (preset buttons + custom input)
- Cause/incident selection dropdown
- Success confirmation animation (UI only for prototype — no real payment)

---

### Firestore Data Helpers

#### [NEW] [firestoreHelpers.js](file:///f:/ResQAI/src/firebase/firestoreHelpers.js)

Centralized Firestore CRUD functions:
- `createReport(citizenId, disasterType, location, title)` — creates report + merges with nearby incidents
- `assignNGOToIncident(incidentId, ngoId)` — admin or self-assign
- `markSituationUnderControl(incidentId, ngoId)` — severity recalculation
- `assignTaskToVolunteer(ngoId, volunteerId, incidentId, description)` — task creation
- `markTaskComplete(taskId)` — volunteer marks done
- `updateNGOInventory(ngoId, inventoryUpdate)` — update resource counts
- `registerAsVolunteer(citizenUid)` — changes citizen role to volunteer
- `createDonation(userId, amount, incidentId)` — logs donation

---

## Architecture Summary

```
src/
├── contexts/
│   └── AuthContext.jsx          [NEW] Global auth state
├── firebase/
│   ├── config.js                [KEEP] Firebase init
│   └── firestoreHelpers.js      [NEW] All Firestore operations
├── components/
│   ├── Map.jsx                  [MODIFY] Enhanced dark map
│   ├── Navbar.jsx               [NEW] Shared navigation
│   ├── TabBar.jsx               [NEW] Tab navigation
│   ├── StatCard.jsx             [NEW] Stats display
│   ├── Modal.jsx                [NEW] Overlay modal
│   ├── SeverityBar.jsx          [NEW] Severity progress
│   ├── FloatingAlert.jsx        [NEW] Alert banner
│   ├── TaskCard.jsx             [NEW] Task display
│   └── DonationForm.jsx         [NEW] Donation UI
├── pages/
│   ├── Auth.jsx                 [MODIFY] Premium redesign
│   ├── Dashboard.jsx            [MODIFY] Full tabbed rebuild
│   └── AdminDashboard.jsx       [MODIFY] Command center rebuild
├── index.css                    [MODIFY] Complete dark theme
├── App.jsx                      [MODIFY] Auth context + guards
└── main.jsx                     [KEEP]
```

---

## Firestore Collections Schema

| Collection | Key Fields | Access |
|------------|-----------|--------|
| `users` | `uid, email, role, name, phone, city, ngoId?, inventory?, skills?, linkedNgoId?, createdAt` | Role-based |
| `incidents` | `title, disasterType, location{lat,lng}, reportCount, severityScore, assignedNGOs[], resolvedNGOs[], createdAt` | All users (read), Citizens (create reports), Admin/NGO (assign) |
| `reports` | `citizenId, incidentId, disasterType, location, timestamp` | Creator + Admin |
| `tasks` | `ngoId, volunteerId, incidentId, description, status(pending/in-progress/completed), createdAt` | NGO (create), Volunteer (update), Admin (read) |
| `donations` | `userId, amount, incidentId?, message?, createdAt` | Creator + Admin |

---

## Dynamic Severity Workflow

1. Citizen reports disaster → creates/merges into `incidents` collection
2. `reportCount` increments → floating alert triggers when > 5 reports
3. Severity starts at **100%**
4. Admin assigns NGOs OR NGOs self-assign → added to `assignedNGOs[]`
5. NGO assigns tasks to volunteers → `tasks` collection
6. Volunteers mark tasks complete → `status: 'completed'`
7. NGO marks "Situation Under Control" → added to `resolvedNGOs[]`
8. **Severity formula**: `Math.max(0, 100 - (resolvedNGOs.length / assignedNGOs.length * 100))`
9. All users see severity change in real-time via Firestore `onSnapshot`
10. When severity = 0%, incident shows as resolved (green)

---

## Verification Plan

### Automated Tests
- `npm run build` — Verify zero compilation errors
- `npm run dev` — Start dev server and verify all routes load

### Manual Verification (Browser Testing)
1. **Auth Flow**: Sign up as Citizen, NGO, Volunteer → verify each lands on correct dashboard with correct tabs
2. **Admin Login**: Login with `resqaiadmin@gmail.com` / `ResQAI123#` → verify admin panel loads
3. **Report Flow**: As citizen, click map → report incident → verify it appears on all dashboards
4. **Aggregation**: Report same location twice → verify `reportCount` increments (not duplicate pin)
5. **NGO Assignment**: As admin, select incident → assign NGO → verify NGO sees it
6. **Self-Assignment**: As NGO, click incident → self-assign → verify assignment
7. **Task Assignment**: As NGO, go to Volunteers tab → assign task → verify volunteer sees it
8. **Task Completion**: As volunteer, mark task done → verify status updates
9. **Severity Decrease**: As NGO, mark "Situation Under Control" → verify severity % drops for all users
10. **Floating Alert**: Create 6+ reports at same location → verify pulsating banner appears for all users
11. **Inventory Management**: As NGO, update food/clothes counts → verify admin sees updated values
12. **Donation**: As any user, submit donation form → verify confirmation
13. **Responsive**: Verify the UI works on mobile viewport widths
