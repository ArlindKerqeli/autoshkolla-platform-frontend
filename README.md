# AutoShkolla Platform — Frontend

Next.js 14 frontend for the AutoShkolla Platform, a multi-tenant driving school management SaaS for Kosovo. All UI text is in Albanian (Kosovo dialect).

The backend lives in a separate repo: `autoshkolla-platform-backend`.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + Radix
- React Query (TanStack Query) for server state
- Zustand for client state
- React Hook Form + Zod for forms
- Axios for the API client
- Playwright for E2E

## Local development

```bash
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL → your local backend
npm run dev                     # http://localhost:3000
```

The dev server proxies `/api/*` to the backend via a Next.js rewrite (see `next.config.js`), so during development your fetch calls to `/api/v1/...` reach `http://localhost:5002`.

## Production deploy (Vercel)

1. Push this repo to GitHub.
2. In Vercel → New Project, import the GitHub repo.
3. Framework preset auto-detects as Next.js. Leave defaults.
4. Set environment variables:
   - `NEXT_PUBLIC_API_URL` → the public URL of your DigitalOcean backend, e.g. `https://api.autoshkolla-platform.com/api/v1`
5. Deploy. Vercel handles everything else.

Remember to add the Vercel domain to `CORS_ORIGIN` in the backend env.

## Tests

```bash
npm run lint
npm run test          # Playwright E2E
```

## Architecture

See `docs/UI_DESIGN_GUIDELINES.md` for the design system and `docs/API_REFERENCE.md` for the API contract this frontend consumes.
