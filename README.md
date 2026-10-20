# mofé menu

[![CI](https://github.com/najdshad/mofe/actions/workflows/ci.yml/badge.svg)](https://github.com/najdshad/mofe/actions/workflows/ci.yml)
[![License: Elastic 2.0](https://img.shields.io/badge/license-Elastic%202.0-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)

A small, serverless menu editor for cafés with more than one venue. Sign in, edit a menu, and it is live at a single public link — no CMS, no frontend framework, no bundler.

**[Live site](https://mofe.ir)** · **[Login](https://mofe.ir/login)**

| Route | What it is |
| --- | --- |
| `/` | Public landing page |
| `/login` | Sign in and edit |
| `/m/<venue>` | Published menu for a venue |
| `/m/<venue>/export/menu.html` | Downloadable standalone menu |
| `/m/<venue>/export/menu.csv` | CSV export, one row per variant |

## Features

- **Multi-venue from the start.** Developers create venues and user accounts. Each user edits only the venue assigned to them; admins manage every venue and account.
- **Instant editing.** Add, rename, reorder, and delete categories and items. Changes save immediately. Move items between categories, toggle sold-out, and add up to 10 variants with a price delta.
- **Per-venue branding.** Set the URL name, cafe name in Persian and English, welcome text, page description, and logo. Logos are resized in the browser to 256×256 WebP and stored as a data URI, so exports stay self-contained.
- **Publishing built in.** Every menu is cached for 30 seconds. Download a standalone HTML file with inline fonts, CSS, and logo — no JavaScript and no external requests — or a CSV.
- **Printable QR cards.** Download a QR card (PNG) for the venue's public link.
- **Simple login.** No passwords. The admin signs in with an identifier from a secret; generated user identifiers are shown once and stored only as hashes.

## Stack

- [Cloudflare Workers](https://workers.cloudflare.com/) for the server
- [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) for data
- TypeScript in the Worker
- Vanilla HTML/CSS/JS for the admin — no frontend framework or bundler

## Local setup

Requirements: Node 20+ and npm. A Cloudflare account is only needed for deployment.

```bash
npm install
cp .dev.vars.example .dev.vars
```

Set a long random `ADMIN_IDENTIFIER` and a random `SESSION_SECRET` (32+ characters) in `.dev.vars`. Generate an identifier with:

```bash
node -e "console.log('mofe_admin_' + require('crypto').randomBytes(24).toString('hex'))"
```

Apply migrations to the local database and start the Worker:

```bash
npm run db:local
npm run dev
```

Then open:

- Landing page: <http://localhost:8787/>
- Login / editor: <http://localhost:8787/login>
- Seeded venue: <http://localhost:8787/m/noghteh>

Log in with the `ADMIN_IDENTIFIER` from `.dev.vars`. The admin account is created on first admin login. From there, create venues and user accounts; each new user receives a generated identifier that is shown once and grants access to their assigned venue only. `/admin` redirects to `/login`.

Local D1 data lives under `.wrangler/`. Rerun `npm run db:local` after adding a migration.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Wrangler locally |
| `npm run deploy` | Deploy the Worker |
| `npm run db:local` | Apply D1 migrations locally |
| `npm run db:remote` | Apply D1 migrations to production |
| `npm test` | Run unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run smoke` | Exercise the local API (server must be running) |
| `npm run template` | Regenerate `src/menu.template.html` from `design.html` |
| `npm run seed:generate` | Regenerate the seeded menu migration |
| `npm run fonts` | Extract admin font files from `design.html` |

`design.html` is the visual source of truth. The generated template, seed migration, and fonts are committed, so the three generation commands are only needed after editing `design.html`.

## Deployment

```bash
npx wrangler login
npx wrangler d1 create mofe-menu
```

Copy the returned `database_id` into `wrangler.jsonc`. Update the routes there too if you are not deploying to `mofe.ir`.

```bash
npx wrangler secret put ADMIN_IDENTIFIER
npx wrangler secret put SESSION_SECRET
npm run db:remote
npm run deploy
```

Use long random values for both secrets. `ADMIN_IDENTIFIER` is the only admin credential; rotating it invalidates existing admin sessions on their next login.

### Continuous deployment

`.github/workflows/ci.yml` runs the typecheck and unit tests on every push and pull request. On `main`, it deploys only after they pass, then checks the production URLs. If the Cloudflare secrets are missing, the deploy job skips with a warning; tests still run.

Add these under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | API token scoped to the account and `mofe.ir` zone, with Workers Scripts: Edit, Workers Routes: Edit, Zone: Read, and D1: Edit |

D1 migrations are intentionally not run by CI. Take a backup, then run `npm run db:remote` manually. The workflow can also be started from **Actions → CI → Run workflow** on `main`.

## Data and backup

Tables: `venues`, `categories`, `items`, `variants`, `users`, `login_attempts`. Everything, including logos, lives in D1.

```bash
npx wrangler d1 export mofe-menu --remote --output=backup.sql
```

## Security

- User identifiers are generated by the Worker, shown once, and stored as SHA-256 hashes. The admin identifier comes from the `ADMIN_IDENTIFIER` secret. Treat identifiers like passwords and send them over HTTPS.
- Sessions are signed HttpOnly cookies bound to a user id and a per-user session version. Changing an identifier or deleting a user invalidates existing sessions.
- Regular users can read and edit only their assigned venue. Venue creation and user management are admin-only.
- Failed logins are limited to five per IP per 15 minutes.
- Mutations require JSON and a same-origin `Origin` header. All queries use prepared statements, and rendered user content is escaped.
- The admin, login shell, and API are `noindex`; CSP is set by the Worker.

## Project layout

```text
design.html    visual source of truth
migrations/    schema and seed
scripts/       template, seed, font extraction, smoke test
src/           Worker, renderer, auth, templates
public/        admin CSS/JS, fonts, robots.txt
test/          Vitest unit tests
```

## License

[Elastic License 2.0](LICENSE) — source-available; you may not provide it as a managed service.
