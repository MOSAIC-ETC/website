# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

This is a Next.js 16 (App Router) web application for the **MOSAIC ETC** — an Exposure Time Calculator for the MOSAIC spectrograph on the ELT (Extremely Large Telescope). All heavy computation runs client-side.

### Routing

All pages live under `src/app/[locale]/`, where `[locale]` is the i18n dynamic segment. Locales are `pt-BR` (default), `en-US`, and `fr-FR`, mapped to short prefixes `/pt`, `/en`, `/fr`. The main feature is at `/(public)/etc/`.

### Core ETC feature

The calculator is self-contained under `src/app/[locale]/(public)/etc/`:

- **`lib/`** — pure computation: `calculate.ts` (1D SNR across wavelengths), `calculate-2d.ts` (2D SNR maps), `conversions.ts` (magnitude/flux), `constants.ts` (physical constants + instrument specs for MOS VIS, MOS NIR, IFU), `schema.ts` (Zod form schemas), `filters.ts`, `objects.ts`, `db.ts` (IndexedDB persistence)
- **`hooks/`** — `use-fits-cube.ts` and `use-csv-tables.ts` load binary FITS cubes and CSV lookup tables from `/public/data/` into memory, with IndexedDB caching
- **`components/`** — form inputs (`etc-form.tsx`, `subcube-form.tsx`) and visualizations (`snr-chart.tsx` with Recharts, `snr-map.tsx` backed by the custom heatmap)

Data flow: user fills form → hooks load FITS/CSV data → `calculateSNR()` / `calculate2DSNR()` runs in the browser → Recharts line chart or custom heatmap renders results.

### Custom heatmap

`src/components/chart/heatmap/` is a bespoke 2D grid visualization (not Recharts). It supports colormaps, z-scale modes, bias/contrast controls, and pan/zoom.

### File parsers

`src/lib/parser/` contains custom parsers for FITS (astronomical image/spectral cubes), CSV, and NM (nanometer filter response curves). These have no external parser library dependency.

### i18n

Locale routing is configured in `src/i18n/routing.ts`. Translation strings are in `/locales/*.json`. Use `next-intl` APIs (`useTranslations`, `getTranslations`) — never hardcode user-visible strings.

### Styling

Tailwind CSS 4 with CSS variables for theming. Dark mode via `next-themes`. Component primitives from Radix UI wrapped in `src/components/ui/` (Shadcn-style). TypeScript path alias: `@/*` → `src/*`.
