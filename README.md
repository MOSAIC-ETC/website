# MOSAIC ETC

Web-based **Exposure Time Calculator** for the MOSAIC spectrograph on the *Extremely Large Telescope* (ELT). All scientific computation (1D SNR across wavelengths, 2D SNR maps) runs in the browser; the server provides versioned file storage, admin tooling, and authentication.

## Tech stack

- **Next.js 16** (App Router) — TypeScript, React 19
- **Prisma 7** + **PostgreSQL 16** — schema, migrations, driver adapter (`@prisma/adapter-pg`)
- **Auth.js v5** — credentials provider, JWT-embedded permissions (RBAC)
- **Tailwind CSS 4** + Radix UI primitives (shadcn-style components)
- **next-intl** — i18n (`pt-BR` default, `en-US`, `fr-FR`)

## Prerequisites

- **Node.js 20+** and **npm**
- **Docker** (for local PostgreSQL) — or an existing Postgres 16 instance

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres (Docker)
docker compose up -d

# 3. Copy env template and fill in values
cp .env.example .env.local
# Generate AUTH_SECRET:   openssl rand -base64 32
# For the Docker DB use:  DATABASE_URL="postgresql://mosaic:mosaic_dev@localhost:5433/mosaic_etc?schema=public"
# STORAGE_PATH can be a local path like "./storage" during dev

# 4. Apply migrations and seed initial data
npx prisma migrate dev
# The seed runs automatically on first migrate; if not, run it explicitly:
npx prisma db seed

# 5. Start the dev server
npm run dev
```

Open <http://localhost:3000> in a browser. Sign in at `/login` with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env.local`. The admin dashboard is at `/admin`.

## Common commands

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on `localhost:3000` |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type-check without emitting |
| `docker compose up -d` | Start local Postgres |
| `docker compose down` | Stop Postgres (data is persisted in a named volume) |
| `npx prisma migrate dev` | Apply schema changes locally + regenerate the client |
| `npx prisma migrate reset` | Drop the DB and re-seed (destructive) |
| `npx prisma db seed` | Re-run the seed script |
| `npx prisma studio` | Browse the database in a GUI |

## Project layout

```
src/
  app/[locale]/(public)/etc/   ETC feature: form, calculation, visualizations
  app/[locale]/(admin)/admin/  Admin pages (filters, objects, tables, users, roles, …)
  app/[locale]/(auth)/         Sign-in, sign-out, accept-invite
  app/api/                     Route handlers (public + admin)
  lib/                         Server utilities (auth helpers, storage, validators)
  hooks/                       Client hooks (manifest, IndexedDB caches)
  components/                  Shared UI (shadcn primitives under ui/)
  i18n/                        next-intl routing configuration
locales/                       Translation JSONs (pt-BR, en-US, fr-FR)
prisma/
  schema.prisma                Database schema
  migrations/                  Versioned SQL migrations
  seed.ts                      Idempotent bootstrap script
  seed-data/                   Filter/table/object files imported by the seed
public/assets/                 Static runtime assets (images, logos)
storage/                       Local file storage (gitignored; created at runtime)
```

## How files are served

The seed reads from `prisma/seed-data/` and imports each file into the storage path defined by `STORAGE_PATH`, recording hash and metadata in Prisma. At runtime, the ETC client reads `/api/manifest` to discover available filters / objects / tables and the current instrument parameters, then fetches binaries from `/api/files/<category>/<slug>[/<role>]`. IndexedDB caches are keyed on the manifest hash so stale entries are evicted when admins upload new versions.

## Internationalization

All user-visible strings live in `locales/*.json`. Use `useTranslations` / `getTranslations` from `next-intl` — never hardcode. Locale prefixes are `/pt`, `/en`, `/fr` (default Portuguese has no prefix on the root).

## Further reading

- [`CLAUDE.md`](CLAUDE.md) — architecture deep-dive for contributors / AI assistants
- [`TCC.md`](TCC.md) — design decisions, tradeoffs, and rationale (in Portuguese; companion to the author's undergraduate thesis)
