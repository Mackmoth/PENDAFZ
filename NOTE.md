# PMS V1 — Project Notes

> Record of what was done on 09-Sep-2026, plus how to launch the project locally.

---

## What the project is

**PFMS (Penda Foundation Management System)** — an internal management platform for Penda Foundation (Uganda).

- React 19 + TanStack Start (SSR) + TanStack Router
- Vite 8 build, Tailwind CSS v4, shadcn/ui
- Supabase backend (PostgreSQL + Auth + Storage + RLS)
- Currency: UGX
- Features: Dashboard, Members, Attendance, Finance, Events, Reports, Users (RBAC, 9 roles), Departments, Branches, Documents, Announcements, Notifications, Audit Logs, Calendar, Birthdays, Settings

---

## What we did (09-Sep-2026)

### 1. Cut off Lovable (the hosted preview/deployment platform)
Previously the app was hosted at `pendams.lovable.app` and built on Lovable's custom tooling. All of it was removed:

- **`vite.config.ts`** — replaced Lovable's `defineConfig` (`@lovable.dev/vite-tanstack-config`) with native Vite plugins:
  - `@tanstack/react-start/plugin/vite` (TanStack Start)
  - `@vitejs/plugin-react`
  - `@tailwindcss/vite`
  - native tsconfig paths (`resolve.tsconfigPaths: true`)
- **`package.json`** — removed `@lovable.dev/vite-tanstack-config` dependency (`npm install` re-ran, `package-lock.json` regenerated)
- **`bunfig.toml`** — removed `@lovable.dev/*` whitelist entries
- **Deleted files:**
  - `src/lib/lovable-error-reporting.ts` (Lovable telemetry)
  - `src/integrations/supabase/previewAuthStorage.ts` (Lovable preview auth broker)
  - `AGENTS.md` (Lovable instructions)
  - `.lovable/` folder (template metadata)
- **`src/integrations/supabase/client.ts`** — removed the preview auth broker import; now uses default localStorage for auth sessions
- **`client.server.ts` / `auth-middleware.ts`** — error messages now say "set in your .env file" instead of "Connect Supabase in Lovable Cloud"
- **`src/routes/__root.tsx`** — removed Lovable error reporting call and the Lovable-hosted OG image tag
- **`README.md`** — removed the "Built with Lovable" footer

### 2. Set up environment variables (`.env`)
Added/updated:
- `SUPABASE_PUBLISHABLE_KEY` = new-format key `sb_publishable_...` (client-side, was the old legacy JWT)
- `SUPABASE_SERVICE_ROLE_KEY` = secret key `sb_secret_...` (server-side admin ops — invite users, manage roles, force password reset, login history)

**IMPORTANT:** `.env` is a secret file and is **gitignored**. Never commit it or share the service role key.

### 3. Verified it runs locally
- `npm run dev` → app serves **HTTP 200** at `http://localhost:5173`
- `npm run build` → production build succeeds (client + server)
- Only pre-existing warnings remain: `createServerFn().inputValidator()` deprecation (in `src/lib/admin.functions.ts`) — harmless

### 4. Initialized git (local backup)
- `git init` — was not a repo before
- Set git user: `Penda Foundation` / `mackmothelijahh@gmail.com`
- Initial commit: `6c96798` — 113 files
- `.env`, `node_modules`, `dist` are gitignored
- No remote yet — repo is local only

---

## How to launch on a local server

### First time / after cloning
```sh
npm install
```

### Start the dev server
```sh
npm run dev
```
Wait until it prints `Local: http://localhost:5173/`, then open **http://localhost:5173** in a browser.
Keep the terminal window open — closing it stops the server.

### Other useful commands
```sh
npm run build       # production build (outputs dist/)
npm run lint        # eslint
npm run format      # prettier --format
npm run preview     # serve the production build locally
```

### The first user
- **The first account that signs up becomes the Super Admin** (handled by a Supabase DB trigger).
- All later users start as `pending_verification` and must be activated by an admin on the Users page.

---

## Key files & locations

| What | Where |
|------|-------|
| Environment config | `.env` (gitignored — secrets live here) |
| Vite/TanStack build config | `vite.config.ts` |
| Supabase client (browser, RLS) | `src/integrations/supabase/client.ts` |
| Supabase admin client (server, service role) | `src/integrations/supabase/client.server.ts` |
| Auth middleware (server) | `src/integrations/supabase/auth-middleware.ts` |
| Admin server functions (invite, roles, reset) | `src/lib/admin.functions.ts` |
| App routes | `src/routes/_authenticated/*.tsx` |
| Database schema/migrations | `supabase/migrations/*.sql` |

---

## Useful Supabase links
- Dashboard: https://supabase.com/dashboard (project `raniattejqpuwyihhxur`)
- API keys / service role: Dashboard → Project Settings → API

---

## Possible next steps (when you come back)
1. Open the app at http://localhost:5173 and sign up as Super Admin (if not done yet)
2. Invite other users (Users page)
3. Seed/add members, departments, branches
4. Decide on hosting — Lovable is gone; can deploy to Vercel/Netlify/Cloudflare later
5. Optionally push git to a remote (GitHub) for offsite backup