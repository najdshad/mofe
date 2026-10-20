# mofé menu

A small, serverless menu editor for multiple cafe venues. A public landing page lives at `/`; the login page and editor live at `/login`; every venue is published at `/m/<venue>`. Developers create venues and user accounts; each user signs in with a generated identifier and edits only the venue assigned to them. The admin can manage all venues and users. Edits are saved immediately. Data lives in Cloudflare D1. The HTML export is one self-contained file per venue.

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

Set a long random `ADMIN_IDENTIFIER` and a random `SESSION_SECRET` in `.dev.vars`. Generate an identifier with, for example:

```bash
node -e "console.log('mofe_admin_' + require('crypto').randomBytes(24).toString('hex'))"
```

The admin account is created from `ADMIN_IDENTIFIER` on the first admin login. Its row is seeded by migration `0004`; the identifier itself is never committed to the repository.

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

- Landing page: `http://localhost:8787/`
- Login / editor: `http://localhost:8787/login`
- Published menu of the seeded venue: `http://localhost:8787/m/noghteh`

Log in with the `ADMIN_IDENTIFIER` from `.dev.vars`. The admin can create venues and user accounts. Each created user receives a generated identifier shown once; that identifier is the user's login and grants access to the assigned venue only.

`/admin` redirects to `/login`. The local D1 database lives under `.wrangler/`. Migrations are applied with `npm run db:local`; rerun it after adding a migration. Migration `0003` moves the original single-cafe menu into the `noghteh` venue. Migration `0004` adds users and the admin account.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Wrangler locally |
| `npm run deploy` | Deploy the Worker |
| `npm run db:local` | Apply D1 migrations locally |
| `npm run db:remote` | Apply D1 migrations to the remote database |
| `npm run template` | Regenerate `src/menu.template.html` from `design.html` |
| `npm run seed:generate` | Regenerate the original single-venue seed (migration `0003` assigns it to the `noghteh` venue) |
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
npx wrangler secret put ADMIN_IDENTIFIER
npx wrangler secret put SESSION_SECRET
npm run db:remote
npm run deploy
```

Open `https://<worker-url>/login` and log in with `ADMIN_IDENTIFIER`. Use a long random value; it is the only credential for the admin account. Rotating the secret invalidates existing admin sessions on the next admin login.

## Editing

The editor supports:

- Admin only: switch between venues from the topbar picker and create venues with «منوی جدید».
- Admin only: open «کاربران» to create a user, assign or change their venue, issue a new identifier, or delete the account. A user can have one venue; several users may share the same venue.
- Regular users see only their assigned venue and cannot create venues or manage users.
- Each venue has a unique URL name; the editor checks availability before saving and the API rejects collisions, so two venues can never publish at the same `/m/<name>`.
- Add, rename, reorder, and delete categories, including categories with items.
- Add, edit, delete, and reorder items within a category.
- Change an item's category from the item dialog; it is appended to the destination.
- Toggle sold-out state.
- Add up to 10 variants per item with a price delta.
- Edit the venue's URL name, cafe name (Persian/English), welcome text, page description, and logo.
- Preview the selected venue's published menu.
- Download the selected venue's standalone HTML or CSV.

Category and item changes are saved instantly. Deleting a category also deletes every item inside it after a confirmation prompt; this cannot be undone.

Each published menu is cached for 30 seconds; the preview link adds a cache-busting query for a fresh view.

Reordering uses up/down buttons everywhere. Item rows also support native drag-and-drop on desktop pointer devices. Touch and keyboard users use the buttons.

### Logo

The logo is resized in the browser to a 256×256 WebP (PNG fallback), then stored as a data URI on the venue row. This keeps the HTML export self-contained and avoids a second storage service. The server checks the data URI type, magic bytes, and size. SVG and GIF uploads are rejected.

## Exports

- `GET /m/<venue>/export/menu.html` — the same rendered menu, as a download.
- `GET /m/<venue>/export/menu.csv` — one row per variant, UTF-8 with BOM, formula-injection sanitizing.

The HTML export contains inline fonts, CSS, and logo. It has no JavaScript and makes no external requests.

## Data and backup

Tables: `venues`, `categories`, `items`, `variants`, `users`, `login_attempts`.

```bash
npx wrangler d1 export mofe-menu --remote --output=backup.sql
```

Categories are unique per venue, so different venues may use the same category name. Branding, including the logo, is included because everything lives in D1.

## Security notes

- Login is by identifier only; there are no passwords. The admin identifier comes from the `ADMIN_IDENTIFIER` secret. User identifiers are generated by the Worker, shown once to the admin, and stored only as SHA-256 hashes.
- Sessions are signed HttpOnly cookies bound to a user id and a per-user session version. Rotating an identifier or deleting a user invalidates existing sessions.
- Regular users can read and edit only their assigned venue. Admin-only routes cover venue creation and user management.
- Five failed logins per IP per 15 minutes.
- Mutations require JSON and a same-origin `Origin` header.
- All queries use prepared statements; rendered user content is escaped.
- The admin, login shell, and API are `noindex`; CSP is set by the Worker. User identifiers are secrets; send them over HTTPS and treat them like passwords.

## Project layout

```text
design.html                  visual source of truth
migrations/                  schema and seed
scripts/                     template, seed, and font extraction
src/                         Worker, renderer, auth, template, admin shell
public/                      admin CSS/JS, fonts, robots.txt
test/                        Vitest unit tests
```
