# mofé menu

A small, serverless menu editor for one cafe. The public menu keeps the design in `design.html`; the owner edits categories, items, variants, sold-out state, ordering, and branding from `/admin`. Data lives in Cloudflare D1. The HTML export is one self-contained file.

## Stack

- Cloudflare Workers
- Cloudflare D1 (SQLite)
- TypeScript for the Worker
- Vanilla HTML/CSS/JS for the admin — no frontend framework or build step

## Local setup

Requirements: Node 20+, a Cloudflare account for deployment, and Wrangler.

```bash
npm install
cp .dev.vars.example .dev.vars
```

Set a real password and a random `SESSION_SECRET` in `.dev.vars`.

Create the local database and seed it:

```bash
npm run template
npm run seed:generate
npm run fonts
npm run db:local
```

Start the Worker:

```bash
npm run dev
```

Open:

- Public menu: `http://localhost:8787/`
- Editor: `http://localhost:8787/admin`

The local D1 database lives under `.wrangler/`. Migrations are applied with `npm run db:local`; rerun it after adding a migration.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Wrangler locally |
| `npm run deploy` | Deploy the Worker |
| `npm run db:local` | Apply D1 migrations locally |
| `npm run db:remote` | Apply D1 migrations to the remote database |
| `npm run template` | Regenerate `src/menu.template.html` from `design.html` |
| `npm run seed:generate` | Regenerate the seed migration from `design.html` |
| `npm run fonts` | Extract the admin font files from `design.html` |
| `npm test` | Run unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run smoke` | Exercise the local API (server must be running) |

`design.html` is the visual source of truth. The generated template, seed migration, and fonts are committed. Runtime code never parses `design.html`.

## First deployment

```bash
npx wrangler login
npx wrangler d1 create mofe-menu
```

Copy the returned `database_id` into `wrangler.jsonc`, replacing the placeholder.

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET
npm run db:remote
npm run deploy
```

Open `https://<worker-url>/admin` and log in with `ADMIN_PASSWORD`.

## Editing

The editor supports:

- Add, rename, reorder, and delete empty categories.
- Add, edit, delete, and reorder items within a category.
- Change an item's category from the item dialog; it is appended to the destination.
- Toggle sold-out state.
- Add up to 10 variants per item with a price delta.
- Edit cafe name (Persian/English), welcome text, page description, and logo.
- Preview the public menu.
- Download standalone HTML or CSV.

A category that still contains items cannot be deleted. Move or delete its items first. This is enforced by the API as well as the UI.

The public page is cached for 30 seconds; the preview link adds a cache-busting query for a fresh view.

Reordering uses up/down buttons everywhere. Item rows also support native drag-and-drop on desktop pointer devices. Touch and keyboard users use the buttons.

### Logo

The logo is resized in the browser to a 256×256 WebP (PNG fallback), then stored as a data URI in the single `settings` row. This keeps the HTML export self-contained and avoids a second storage service. The server checks the data URI type, magic bytes, and size. SVG and GIF uploads are rejected.

## Exports

- `GET /export/menu.html` — the same rendered menu, as a download.
- `GET /export/menu.csv` — one row per variant, UTF-8 with BOM, formula-injection sanitizing.

The HTML export contains inline fonts, CSS, and logo. It has no JavaScript and makes no external requests.

## Data and backup

Tables: `categories`, `items`, `variants`, `settings`, `login_attempts`.

```bash
npx wrangler d1 export mofe-menu --remote --output=backup.sql
```

Branding, including the logo, is included because everything lives in D1.

## Security notes

- One admin password; sessions are signed HttpOnly cookies.
- Five failed logins per IP per 15 minutes.
- Mutations require JSON and a same-origin `Origin` header.
- All queries use prepared statements; rendered user content is escaped.
- The admin and API are `noindex`; CSP is set by the Worker.

## Project layout

```text
design.html                  visual source of truth
migrations/                  schema and seed
scripts/                     template, seed, and font extraction
src/                         Worker, renderer, auth, template, admin shell
public/                      admin CSS/JS, fonts, robots.txt
test/                        Vitest unit tests
```
