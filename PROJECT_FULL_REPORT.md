# ResQAI Project Full Report

Generated on: 2026-04-27
Workspace root: `e:/ResQAI`

## 1. Project Snapshot

ResQAI is currently a Vite + React + Firebase web application with AI-assisted crisis scanning and incident analysis features. The workspace includes:
- Active frontend app in `src/`
- Firebase integration in `src/firebase/`
- AI service modules in `src/services/`
- Placeholder backend and serverless API directory structures (`backend/`, `api/`) that are currently empty
- Build output in `dist/`
- One runtime artifact image in `artifacts/`

Important discrepancy:
- `README.md` describes a Python/FastAPI backend architecture, but this repository state currently implements a client-heavy React/Firebase architecture, and the backend folders are empty placeholders.

## 2. Complete Current Inventory (Project Files)

This list reflects all workspace files excluding `node_modules` and `.git` internals.

```text
.env
.gitignore
activity.log
DataExtract.js
eslint.config.js
implementation_plan.md
index.html
package-lock.json
package.json
README.md
vite.config.js
artifacts/
  verify_new_ui_port_5174_1777197245330.webp
api/
  admin/
  crisis-reports/
backend/
  src/
    config/
    controllers/
    data/
    jobs/
    middleware/
    models/
    repositories/
    routes/
    scrapers/
      sources/
      utils/
    scripts/
    services/
    utils/
dist/
  favicon.svg
  icons.svg
  index.html
  assets/
    index-DKp-l1p2.js
    index-hkws7N8e.css
public/
  favicon.svg
  icons.svg
src/
  App.css
  App.jsx
  index.css
  main.jsx
  assets/
    hero.png
    react.svg
    vite.svg
  components/
    DonationForm.jsx
    FloatingAlert.jsx
    Map.jsx
    Modal.jsx
    Navbar.jsx
    SeverityBar.jsx
    StatCard.jsx
    TabBar.jsx
  contexts/
    AuthContext.jsx
  firebase/
    config.js
    firestoreHelpers.js
  pages/
    AdminDashboard.jsx
    Auth.jsx
    Dashboard.jsx
  services/
    crisisScanner.js
    incidentVision.js
```

## 3. Directory-by-Directory Status

### 3.1 `src/` (active application code)
- Fully active and implemented.
- Contains app shell, routing, auth state, pages, components, Firebase access, and AI service logic.

### 3.2 `public/`
- Static icons/assets used by the frontend.

### 3.3 `dist/`
- Built output from Vite (`vite build` result).
- Contains optimized JS/CSS bundles and copied static assets.

### 3.4 `artifacts/`
- Contains visual verification artifact image (`.webp`) from prior UI validation.

### 3.5 `api/`
- `api/admin/` is empty.
- `api/crisis-reports/` is empty.
- Directory structure exists but no serverless route handlers are currently present.

### 3.6 `backend/`
- `backend/src/` has full layered folder skeleton:
  - `config/`, `controllers/`, `data/`, `jobs/`, `middleware/`, `models/`, `repositories/`, `routes/`, `scripts/`, `services/`, `utils/`
  - `scrapers/sources/`, `scrapers/utils/`
- All folders above are currently empty.

## 4. Root Files and What They Contain

### `.env`
Contains Vite environment variables for:
- Firebase web config (`VITE_FIREBASE_*` keys)
- Gemini API integration (`VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`)

Note: secrets are present in this local file and should not be committed.

### `.gitignore`
Ignores logs, `node_modules`, `dist`, local env variants, and IDE/editor artifacts.

### `package.json`
- Project name: `resqai`
- Type: ES modules (`"type": "module"`)
- Scripts:
  - `dev`: `vite`
  - `build`: `vite build`
  - `lint`: `eslint .`
  - `preview`: `vite preview`
- Core dependencies:
  - `react`, `react-dom`, `react-router-dom`
  - `firebase`
  - `@google/genai`
  - `leaflet`, `react-leaflet`
  - `lucide-react`
- Dev dependencies include Vite and modern ESLint stack.

### `package-lock.json`
Resolved npm dependency lockfile.

### `vite.config.js`
Minimal Vite config using React plugin.

### `eslint.config.js`
Flat ESLint config with:
- `@eslint/js`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- Browser globals

### `index.html`
Base SPA HTML with:
- SEO description/theme color metadata
- Google Fonts preload (Inter)
- Leaflet stylesheet
- root mount node and script entry to `src/main.jsx`

### `README.md`
High-level product narrative, SDG alignment, and contributor details.

### `implementation_plan.md`
Detailed product/engineering plan describing a large UI/feature overhaul and intended architecture behavior.

### `DataExtract.js`
Standalone Node script using `@google/genai` and `fs` to:
- Query Gemini for crisis events
- Parse JSON response
- Print reports to console
- Append logs to `activity.log`

Security observation:
- Contains a hardcoded API key literal in source.

### `activity.log`
Execution log for `DataExtract.js`; currently shows repeated Gemini `503 UNAVAILABLE` overload errors.

## 5. Frontend Code (`src/`) Detailed Report

### 5.1 App Boot and Routing

#### `src/main.jsx`
- React entry point.
- Renders `<App />` in strict mode.

#### `src/App.jsx`
- Wraps app in `AuthProvider`.
- Uses `react-router-dom` routes:
  - `/` -> Auth page
  - `/dashboard` -> User dashboard
  - `/admin` -> Admin dashboard
  - wildcard -> redirect to `/`

#### `src/App.css`
- Intentionally minimal/placeholder (`Removed default Vite CSS`).

#### `src/index.css`
- Main design system and layout CSS.
- Defines color tokens, card styles, sidebar layout, button styles, form styles, badge styles, map/dashboard UI style system.

### 5.2 Auth State and User Context

#### `src/contexts/AuthContext.jsx`
- Centralized auth/user state via React context.
- Listens to Firebase `onAuthStateChanged`.
- Loads user profile doc from Firestore (`users` collection).
- Falls back to admin role for email `resqaiadmin@gmail.com` if profile doc missing.
- Exposes `user`, `userData`, `loading`, and `logout`.

### 5.3 Firebase Integration

#### `src/firebase/config.js`
- Initializes Firebase app from env vars.
- Exports:
  - `auth`
  - `db` (Firestore)
  - `storage` (Cloud Storage)

#### `src/firebase/firestoreHelpers.js`
Central Firestore operations, including:
- Incident/report creation with geographic merge logic (`submitCitizenReport`)
- Severity scoring model with disaster baseline + urgency + confidence + resource weights
- NGO assignment (`assignNGOToIncident`)
- Model-assisted auto-assignment of NGOs by resource fit and proximity (`autoAssignNGOsForIncidentModel`)
- Incident control/resolution updates (`markSituationUnderControl`)
- Task lifecycle (`assignTask`, `markTaskComplete`)
- NGO inventory updates (`updateInventory`)
- User location update (`updateUserLocation`)
- Donation creation (`createDonation`)
- Volunteer role/membership transitions (`registerCitizenAsVolunteer`, `joinVolunteerToNGO`, `leaveVolunteerNGO`)
- AI-generated incident persistence with duplicate title detection (`saveAIIncidentsToFirestore`)

### 5.4 Pages

#### `src/pages/Auth.jsx`
- Login/signup flows with Firebase Auth.
- Role-based registration (`citizen`, `ngo`, `volunteer`).
- Volunteer must select existing NGO at signup.
- NGO signup supports geolocation/manual coordinates and initializes inventory.
- Admin routing logic sends admin user to `/admin`.

#### `src/pages/Dashboard.jsx`
Role-driven operational dashboard for citizen/ngo/volunteer with:
- Realtime incidents/tasks/reports via Firestore snapshots
- Interactive map usage
- Citizen reporting flow with required image upload
- AI photo analysis and evidence verification integration
- Incident submission with optional Storage upload for evidence photo
- NGO self-assignment and inventory management
- NGO volunteer task assignment
- Volunteer NGO joining/leaving and task completion
- Donation UI integration
- AI crisis scanner execution and save-to-Firestore flow
- Floating alerts for severe/high-report incidents

#### `src/pages/AdminDashboard.jsx`
Admin command-center dashboard with:
- Incident, NGO, volunteer, donation live views
- Severity and response status tracking
- Manual NGO assignment and nearest-NGO sorting by distance
- Auto-assignment using model scoring
- Dedicated AI Scanner tab with scan logs/results
- Overview metrics cards and map view

### 5.5 Components

#### `src/components/TabBar.jsx`
- Sidebar navigation with brand and role-specific tabs.

#### `src/components/Navbar.jsx`
- Top bar with current user name, role badge, and logout.

#### `src/components/Map.jsx`
- Leaflet-based map rendering incidents and user location.
- Severity-coded marker styling.
- AI incident marker distinction.
- Rich marker popup detail views.
- Optional click-capture for citizen report creation.

#### `src/components/SeverityBar.jsx`
- Gradient severity progress visualization by value range.

#### `src/components/StatCard.jsx`
- Metric card UI for dashboards.

#### `src/components/FloatingAlert.jsx`
- Dismissible alert banner.

#### `src/components/Modal.jsx`
- Generic modal overlay wrapper.

#### `src/components/DonationForm.jsx`
- Preset and custom donation amount form.
- Optional incident targeting and message.
- Local success state view post submission.

### 5.6 Services (AI)

#### `src/services/crisisScanner.js`
- Uses `@google/genai` with Google Search tool.
- Prompts Gemini for recent India crisis events.
- Tries model fallback when overloaded.
- Normalizes outputs into app-specific incident objects with:
  - disaster metadata
  - casualties and logistics
  - AI analysis summary/urgency/confidence
  - required resource predictions

#### `src/services/incidentVision.js`
Image intelligence pipeline with:
- Incident photo analysis for urgency/resource prediction (`analyzeIncidentPhoto`)
- Evidence verification/risk scoring (`verifyIncidentEvidence`)
- Metadata heuristics fallback if model unavailable
- Model discovery and fallback generation flow
- JSON response parsing and safety clamping
- Disaster-specific fallback resource templates

### 5.7 Static Assets (`src/assets/`)
- `hero.png`: UI visual asset
- `react.svg`, `vite.svg`: framework icons

## 6. Data and Realtime Model (Observed in Code)

Primary Firestore collections used:
- `users`
- `incidents`
- `reports`
- `tasks`
- `donations`

Key realtime subscriptions:
- Incidents on user and admin dashboards
- Role-specific tasks
- NGO and volunteer lists
- Donations (admin)
- User doc updates for role/profile/inventory

## 7. Runtime and Build System

- Dev server: `npm run dev` (Vite)
- Production build: `npm run build`
- Local preview: `npm run preview`
- Linting: `npm run lint`

Build artifacts observed in `dist/` indicate at least one successful build has been produced.

## 8. Security and Operational Observations

1. `.env` contains client and AI keys (expected locally; should remain excluded from VCS).
2. `DataExtract.js` includes a hardcoded API key in source code (should be moved to env var).
3. Client-side Firebase app uses Firestore/Storage directly; robust Firebase security rules are critical.
4. AI features rely on external model availability; logs show occasional `503` model overload conditions.

## 9. Architecture Reality Check

Current implementation reality:
- Frontend-first architecture with Firebase backend services.
- AI augmentation for both external crisis ingestion and user-submitted evidence assessment.

Planned/placeholder architecture:
- Empty `backend/` and `api/` directories suggest intended future server-side expansion.

## 10. What Is Included vs Not Included Right Now

Included now:
- Full React UI flows for auth, dashboards, map, donation, volunteer/NGO/admin operations
- Firestore CRUD/realtime operations
- AI scan and image analysis integration
- Build pipeline and static deployment output

Not included now:
- Implemented code inside `backend/src/*`
- Implemented code inside `api/admin` and `api/crisis-reports`
- Any active Python/FastAPI service code in this workspace

## 11. Summary

ResQAI currently functions as a sophisticated React + Firebase crisis intelligence platform with AI-enhanced incident ingestion and verification. The repository also contains a prepared-but-empty backend/API directory skeleton, indicating future expansion toward hybrid or server-heavy architecture. The most complete and active logic lives in `src/pages/`, `src/firebase/`, and `src/services/`.
