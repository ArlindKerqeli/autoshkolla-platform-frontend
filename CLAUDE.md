# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

**autoshkolla-platform-frontend** — Next.js 14 (App Router) + TypeScript frontend for AutoShkolla Pro, a multi-tenant driving school management SaaS for Kosovo. **All UI text is in Albanian (Kosovo dialect).** Deploys to Vercel.

The Flask backend lives in a separate sibling repo, **autoshkolla-platform-backend**. The parent folder `~/Desktop/autoshkolla-platform/` is not itself a git repo — it just holds the two child repos side by side, with a top-level `CLAUDE.md` covering the cross-repo workspace.

## Tech stack

- Next.js 14 (App Router) + React 18 + TypeScript 5 (strict — no `any`)
- Tailwind CSS + **shadcn/ui** (Radix primitives, components in `components/ui/`)
- **@tanstack/react-query** for server state, **@tanstack/react-table** for data tables
- **Zustand** for client/global state
- **react-hook-form** + **Zod** for forms
- **axios** for the API client (`lib/api.ts`)
- `lucide-react` icons, `recharts` for dashboards, `date-fns`, `react-day-picker`
- `next-themes` for theme handling, `cmdk` for command palette
- PWA: custom service worker (`public/sw.js`) + manifest, install prompt hook
- **Playwright** for E2E (`npm run test`); ESLint via `npm run lint`. No unit-test runner configured.

## Architecture

- **App Router** at `app/`, with three role-based layouts that act as personas:
  - `app/dashboard/`   — admin & lecturer UI (default tenant dashboard)
  - `app/instructor/`  — instructor portal (read-only on candidates, calendar, debt, messages)
  - `app/superadmin/`  — platform-level tenant management (separate red color scheme)
  - `app/login/`       — public, the only unauthenticated route besides errors
  After login, the user is redirected based on `user.role` (`super_admin` → `/superadmin`, `admin`/`lecturer` → `/dashboard`, `instructor` → `/instructor`). Super-admins are kept off `/dashboard` — to view tenant data they must impersonate.
- **`middleware.ts`** runs on the Edge and currently only excludes static assets — it intentionally **does not** check auth (can't read localStorage at the Edge). All auth gating is client-side via `AuthProvider` in `lib/auth-context.tsx`.
- **API client** (`lib/api.ts`):
  - Base URL = `NEXT_PUBLIC_API_URL` in production; falls back to `/api/v1` in dev (the Next rewrite in `next.config.js` forwards `/api/*` → `http://localhost:5002`).
  - Request interceptor injects `Bearer ${localStorage.accessToken}`.
  - Response interceptor **unwraps the backend's `{success, data}` envelope** — call sites get `data` directly.
  - 401 → tries `POST /auth/refresh` with `refreshToken`, retries the original request once, on failure redirects to `/login` and clears tokens.
  - Errors are normalized to `{message, status, details}`; the default user-facing message is `"Ka ndodhur nje gabim"` (Albanian).
- **Server vs client components**: prefer Server Components; mark client components with `'use client'`. Forms, state hooks, React Query, and anything reading localStorage must be client.
- **State boundaries**: React Query for anything fetched from the API; Zustand for cross-page UI state; component state for local UI; localStorage holds `accessToken` and `refreshToken` only.
- **PWA / offline**: `lib/offline-db.ts` + `lib/offline-store.ts` back an IndexedDB-style offline cache; `lib/sw-register.ts` registers the service worker. `sw.js` must not be browser-cached (handled in `next.config.js` headers).

## Project layout

```
autoshkolla-platform-frontend/
├── CLAUDE.md                       # this file
├── README.md
├── next.config.js                  # /api rewrite to :5002 in dev, sw.js cache headers
├── middleware.ts                   # edge: skip static, defer auth to client
├── tailwind.config.ts
├── tsconfig.json                   # paths: @/* → ./*
├── components.json                 # shadcn/ui config
├── vercel.json
├── package.json                    # scripts: dev, build, start, lint, test (Playwright)
├── .env.example                    # NEXT_PUBLIC_API_URL
├── generate_icons.py               # one-off PWA icon generator
├── app/                            # App Router pages
│   ├── layout.tsx, error.tsx, not-found.tsx
│   ├── login/                      # public
│   ├── dashboard/                  # admin/lecturer persona (layout.tsx + segments)
│   │   ├── kandidatet/, instruktoret/, automjetet/, kategorite/, shkolla/
│   │   ├── ore-teorike/, ore-praktike/, pagesat/, shpenzimet/, vertetimet/
│   │   ├── borxhi-instruktoreve/, kalendari/, provimet/, perdoruesit/, cilesimet/
│   ├── instructor/                 # instructor persona
│   │   └── kandidatet/, kalendari/, borxhi/, mesazhet/, cilesimet/
│   └── superadmin/                 # super-admin persona
│       └── statistikat/
├── components/                     # React components, grouped by domain
│   ├── ui/                         # shadcn/ui primitives — DO NOT edit directly unless re-generating
│   ├── auth/                       # AuthProvider, login forms
│   ├── candidates/                 # candidate wizard, detail tabs, list
│   ├── payments/, expenses/
│   ├── admin/, superadmin/
│   ├── layout/                     # sidebars, headers per persona
│   ├── pwa/                        # install prompt, offline indicator
│   └── shared/                     # data tables, status badges, filters reused across domains
├── lib/
│   ├── api.ts                      # axios client (envelope-unwrapping, JWT refresh)
│   ├── auth-context.tsx            # AuthProvider — current user, role, login/logout
│   ├── query-provider.tsx          # React Query client setup
│   ├── offline-db.ts, offline-store.ts, sw-register.ts
│   ├── utils.ts                    # cn() etc.
│   └── types/                      # api.ts, models.ts (mirrors backend schemas), index.ts
├── hooks/
│   ├── use-toast.ts                # shadcn toast hook
│   └── useInstallPrompt.ts         # PWA install
├── pages/                          # legacy /pages — used only if App Router doesn't cover something
├── public/                         # icons, sw.js, manifest.json
├── styles/                         # globals.css (Tailwind layers + tokens)
└── docs/
    ├── API_REFERENCE.md            # mirrors the backend's API contract (source of truth lives in backend repo)
    └── UI_DESIGN_GUIDELINES.md     # design system, sidebar groups, table conventions
```

## Route naming convention

URL segments inside `app/dashboard/` and `app/instructor/` are **Albanian** (matching the visible nav). When adding a new page, mirror the Albanian noun used in the sidebar — don't introduce English route names (e.g. it's `kandidatet/`, never `candidates/`). The corresponding backend resource is English (`/api/v1/candidates`).

## Commands

```bash
# Setup
npm install
cp .env.example .env.local                 # set NEXT_PUBLIC_API_URL (or leave blank for dev rewrite)

# Dev (port 3000, proxies /api → :5002 via next.config.js)
npm run dev

# The backend must be running on :5002 for the dev proxy to work.
# Override with API_PROXY_TARGET if backend is elsewhere.

# Build / start (production)
npm run build
npm run start

# Quality
npm run lint                               # ESLint (ts, tsx)
npm run test                               # Playwright E2E
npx playwright test path/to/spec.ts        # single E2E spec
npx playwright test --ui                   # Playwright UI mode
```

## Code conventions

- **Strict TypeScript** — no `any`. Prefer `unknown` + narrowing if needed.
- Use **React Server Components** by default; reach for `'use client'` only when needed (state, effects, browser APIs, event handlers).
- All API calls go through `lib/api.ts` — don't `fetch()` the backend directly. Call sites receive the unwrapped `data` (or the normalized error object).
- **Forms**: react-hook-form + Zod resolver. Validation error messages **in Albanian** (Kosovo dialect).
- **Server state**: React Query (`useQuery`, `useMutation`) with sensible cache keys. Don't mirror server state into Zustand.
- **Global UI state**: Zustand stores in `lib/` (e.g. `offline-store.ts`).
- **Imports**: use the `@/` alias (configured in `tsconfig.json`) — e.g. `import { api } from "@/lib/api"`.
- **Components organized by domain** under `components/<domain>/`. `components/ui/` is shadcn-generated; treat as auto-generated.
- **Dates**: display `dd.MM.yyyy` everywhere via `date-fns`. Currency: Euro (€).
- **Toasts and copy**: Albanian only. Generic error fallback string is `"Ka ndodhur nje gabim"` to match `lib/api.ts`.

## UI design rules

The legacy system was Bootstrap 3; this frontend is a full modern redesign while preserving 100% of the business logic and workflows. See `docs/UI_DESIGN_GUIDELINES.md` for the full spec. Highlights:

- Collapsible sidebar grouped into **6 sections** (not 16+ flat items).
- Smart data tables with column visibility, advanced filters, status badges (use `components/shared/` table primitives).
- **Multi-step wizard** for candidate registration (not a 30-field single page).
- **Tab-based candidate detail** page: Personal, Theory Hours, Practical, Payments, Documents, History.
- Admin dashboard as landing page: metrics, revenue charts, category breakdown, today's schedule, activity feed, alerts.
- Mobile-responsive — instructor portal is used on tablets in the car.
- Color palette: primary blue `#2563EB`, clean grays, proper semantic colors. Super-admin persona uses red.
- Font: **Inter** with Albanian character support (`ë`, `ç` must render).

## Persona-specific rules

### Admin / lecturer (`/dashboard/*`)
Full CRUD on candidates, instructors, vehicles, categories, payments, expenses, exams, verifications. Manages users in their tenant via `/dashboard/perdoruesit`. Settings (account info, password change) in `/dashboard/cilesimet`.

### Instructor (`/instructor/*`)
- Read-only on candidates assigned to them — `/instructor/kandidatet` lists, never lets create / edit / delete.
- `/instructor/kalendari` — day/week/month calendar of practical lessons. Marking a lesson `completed` triggers backend creation of a `practical_hour_sessions` row.
- `/instructor/borxhi` — instructor debt: 65€/candidate (configurable backend-side via `instructor.cost_per_candidate`). Shows total owed, paid, balance, per-candidate breakdown.
- `/instructor/mesazhet` — threaded conversations with admins of the same tenant.
- `/instructor/cilesimet` — instructor settings.

### Super-admin (`/superadmin/*`)
- Tenant CRUD, expand to manage users per tenant, **impersonate** any user (which routes them through the regular login as that user).
- Platform-wide statistics under `/superadmin/statistikat`.
- Red color scheme; super-admins are redirected away from `/dashboard` — they must impersonate to view tenant data.

## Auth flow specifics

- Tokens live in `localStorage` as `accessToken` and `refreshToken` (NOT cookies on the frontend). Set during login by `AuthProvider`.
- `lib/api.ts` automatically refreshes on 401 once per request, then redirects to `/login` on failure.
- The Edge middleware in `middleware.ts` does NOT enforce auth — that's deliberate. Pages and layouts must wrap themselves in `AuthProvider` and rely on its `useAuth()` hook to redirect.
- Role-based redirect after login is the responsibility of `AuthProvider` / the login page, based on `user.role` from `GET /auth/me`.

## Deployment (Vercel)

- Framework auto-detected. No special build config.
- Required env: `NEXT_PUBLIC_API_URL` = the public backend URL **including the `/api/v1` suffix** (e.g. `https://api.autoshkolla-platform.com/api/v1`).
- After deploy, add the resulting Vercel domain to the backend's `CORS_ORIGIN`. They must agree.
- The `/api` dev rewrite in `next.config.js` is unused on Vercel (`NEXT_PUBLIC_API_URL` points the axios client straight at the backend).

## Source-of-truth docs

The frontend's `docs/` mirror only what the frontend needs (`API_REFERENCE.md`, `UI_DESIGN_GUIDELINES.md`). The authoritative API reference, database schema, modules status, changelog, PDF templates, and SMS spec all live in the **backend** repo's `docs/`. If you need ground truth on an endpoint or schema, read the backend's `docs/API_REFERENCE.md` / `docs/DATABASE_SCHEMA.md`.

## Albanian UI glossary (every label / button / route segment uses these)

```
Kandidatet=Candidates · Instruktor=Instructor · Ligjerues=Lecturer · Automjetet=Vehicles
Shpenzimet=Expenses · Pagesat=Payments · Kategoria=Category · Borxhi=Debt
Ore Teorike=Theory Hours · Ore Praktike=Practical Hours · Ore Plotesuese=Supplementary Hours
Vërtetimi=Certificate · Fatura=Invoice · Fletëparaqitja=Registration Form
Libreza=Logbook · Kontrata=Contract · Testi=Test · Arkiva=Archive
Evidenca Oreve=Hours Evidence · Provimet=Exams · Cilesimet=Settings · Perdoruesit=Users · Shkolla=School
Mesazhet=Messages · Kalendari=Calendar · Paneli=Dashboard · Alarmet=Alerts · Statistikat=Statistics
Kerko=Search · Registro=Register · Ruaj=Save · Mbyll=Close · Anulo=Cancel · Fshi=Delete · Edito=Edit · Paguaj=Pay · Planifiko=Schedule
Profili Im=My Profile · Kandidatët e Mi=My Candidates · Mësimet Sot=Today's Lessons · Pagesat e Instruktorëve=Instructor Payments
```
