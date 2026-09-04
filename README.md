# mofé

Persian-first digital menu for Iranian cafes. Owners build and publish a beautifully typeset menu; customers scan a QR code and get a static, blazing-fast page — no app, no install.

## Features

- **Menu editor** — categories & items with drag-and-drop reorder, bilingual names, prices, variants, allergens (14), calories, sold-out toggles, photos (auto-compressed WebP ≤50KB)
- **CSV** — import with header alias detection, export, downloadable template
- **QR menu** — one-click publish renders a self-contained static HTML snapshot (zero JS, `script-src 'none'`), RTL, mobile-first, sticky category nav with scroll-spy, in-memory cache (60s TTL)
- **Branding** — per-venue accent color, logo, welcome message
- **Auth & security** — sessions (SHA-256 tokens, 7-day TTL), bcrypt, CSRF on all mutations, DB-backed rate limiting, one owner per venue

## Screenshots

![Screenshot 1](assets/Screenshot%202026-09-03%20175609.png)

![Screenshot 2](assets/Screenshot%202026-09-03%20175659.png)

![Screenshot 3](assets/Screenshot%202026-09-03%20175826.png)

![Screenshot 4](assets/Screenshot%202026-09-03%20175913.png)

## Quick start

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

No DB server or env vars — SQLite lives in `prisma/dev.db`. Open http://localhost:3000.

Demo login: `admin@noghteh` / `demo1234`

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Dev / build / serve production |
| `npm test` / `test:watch` | Vitest |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:push` / `db:migrate` / `db:studio` / `db:reset` | Prisma ops on the SQLite file |
| `npx prisma db seed` | Seed demo venue |
| `npm run menu:download -- --slug <slug> [--output <file>]` | Export the current public menu as one standalone HTML file |

To download a published menu for offline sharing or printing:

```bash
npm run menu:download -- --slug noghteh-test --output ./exports/noghteh.html
```

The command uses the same active categories and items as `/m/<slug>`, then
inlines mofé's self-hosted fonts and locally uploaded images into the output
file. External image URLs, if present in legacy data, remain as URLs.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · SQLite + Prisma · Vitest · self-hosted fonts (no CDNs)

## Docs

- [Design system](DESIGN-LANGUAGE.md)
- [Agent development guide](AGENTS.md)
- [CSV template](sample-csv.csv)
