<img src="client/public/logo-mark.png" alt="EventForge logo" width="96" />

# EventForge

A B2B corporate event management platform — MERN stack, built end-to-end in phases.

**Status:** feature-complete across all 7 build phases — auth (email/password + Google
Sign-In), organizations/members/RBAC/invites, event lifecycle + registration/waitlist,
role-aware dashboards/calendar/analytics, in-app notifications + a deadline-reminder cron
job, a full audit-log browser, a responsive/accessible UI, **ForgeAI** (an optional Gemini-powered
event copilot: draft an event from a sentence, suggest concepts and venues, polish text), and an
automated test suite (backend + frontend) backing it all.

## Stack

- **Backend:** Express 5, Mongoose, JWT (httpOnly cookies), Zod validation, Cloudinary/local-disk
  storage adapter, Pino logging.
- **Frontend:** React 19, Vite, React Router, TanStack Query, React Hook Form + Zod, Tailwind v4,
  Framer Motion, Lucide icons.
- **Database:** MongoDB (local for dev; swap `MONGODB_URI` to an Atlas URI for production — no
  code changes needed).
- **AI (optional):** Google Gemini through `@google/genai`, behind one adapter file. Without a key the
  app works as usual and ForgeAI shows a "not set up" state.

## Local setup

Prerequisites: Node 20+, a running MongoDB instance (local `mongod` or Atlas).

```bash
# Backend
cd server
cp .env.example .env      # fill in JWT_SECRET / JWT_REFRESH_SECRET (openssl rand -hex 32)
npm install
npm run seed               # creates a demo user, prints credentials
npm run dev                # http://localhost:4000

# Frontend (separate terminal)
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173 (or next free port — Vite auto-increments)
```

If the frontend lands on a port other than 5173 (something else already listening), update
`CLIENT_URL` in `server/.env` to match, or free the port first.

**Note (macOS):** port 5000 is commonly occupied by AirPlay Receiver — this project defaults the
API to port 4000 to avoid that conflict.

### Demo credentials

Printed by `npm run seed`:
```
ava@eventforge.dev / Demo@1234
```

## Running tests

```bash
# Backend — jest + supertest + mongodb-memory-server
cd server && npm test

# Frontend — vitest + testing-library + msw
cd client && npm test
```

The backend suite spins up its own in-memory MongoDB per test file (`mongodb-memory-server`) —
no local `mongod` needs to be running, and it never touches your real dev database. It also
never makes real third-party calls: `tests/setup/jestEnv.js` blanks `RESEND_API_KEY` and every
other optional credential before any test file imports the app, regardless of what's actually
set in your real `server/.env`. The frontend suite intercepts HTTP at the network layer with MSW
rather than mocking `axios` directly, so the real interceptor logic (401 → refresh → retry) runs
under test; `client/.env.test` blanks `VITE_GOOGLE_CLIENT_ID` the same way, so Google Sign-In
components don't need a live `GoogleOAuthProvider` in tests.

## Environment variables

See `server/.env.example` and `client/.env.example` for the full list with descriptions — most
of it (Cloudinary, Resend/SMTP, Google Sign-In) is optional and has a working fallback with zero
config. The vars a first-time setup actually has to touch:

| Var | Where | Notes |
|---|---|---|
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `server/.env` | Required, must differ from each other. Generate with `openssl rand -hex 32`. |
| `MONGODB_URI` | `server/.env` | Defaults to local `mongodb://localhost:27017/eventforge` — see "Swapping to MongoDB Atlas" below to point it at a hosted cluster instead. |
| `CLIENT_URL` | `server/.env` | Must match whatever port Vite actually lands on (see the macOS port note above); drives both CORS and the links in outgoing emails. Comma-separate multiple values to allow more than one origin (e.g. a deployed frontend plus a local dev client). |
| `COOKIE_DOMAIN` | `server/.env` | Leave blank for local dev. Only needed once frontend/backend share a parent domain in production (e.g. `.eventforge.com`). |

### ForgeAI (optional, Gemini)

ForgeAI drafts an event from a sentence, suggests three concepts for a vibe, suggests venue types, and
polishes text (professional / energetic / invitation email). It is off until the server has a key:

1. Create a free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Put it in **`server/.env` only** as `GEMINI_API_KEY=...` — never in `client/.env` (everything in a
   client variable is shipped to the browser) and never in a commit — then restart the server.
3. `cd server && npm run ai:check` lists the models your key can call and makes one tiny request.
   Model names change; `GEMINI_MODEL` (default `gemini-3.5-flash-lite`) is an env var for that reason.

Who can use it: people who can create events (organizers and admins). What the model sees: only the
text typed into the panel, never organization, user or event data. What is guarded: the input (length,
injection phrasing, emails and phone numbers are refused), the output (schema-checked, then cleaned of
HTML and links and clamped), and the volume (10 requests a minute per person, and a shared
`AI_GLOBAL_RPM` bucket, because Google's quota is per *project*, not per person). Repeat requests are
served from an in-memory cache and cost nothing.

**Use a paid key before real customers.** On Google's free tier, prompts and responses may be used to
improve Google's products and reviewed by people, and Google asks that no sensitive, confidential or
personal information be submitted. The panel says so, but a paid key is the real fix for production.
The cache and limiters live in the server process, so they are per instance.

Image uploads and email both work without any third-party account in dev (local-disk storage,
console-logged emails) and pick up real credentials automatically the moment those env vars are
set — no code changes required either way (see "Adding Cloudinary" below for that one).

### Swapping to MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), add a database
   user, and allow your current IP (or `0.0.0.0/0` for quick testing) under Network Access.
2. Copy the connection string from Atlas's "Connect your application" dialog — it looks like
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/eventforge?retryWrites=true&w=majority`.
3. Set `MONGODB_URI` in `server/.env` to that string. No code changes needed — `config/db.js`
   just calls `mongoose.connect(config.MONGODB_URI)` regardless of which host it points at.
4. Run `npm run seed` again against the new database if you want the demo account there too.

### Adding Cloudinary

1. Create a free account at [cloudinary.com](https://cloudinary.com) and grab your Cloud Name,
   API Key, and API Secret from the dashboard.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `server/.env`.
3. Restart the server. `services/storage/index.js` picks Cloudinary automatically the moment all
   three are set — event cover images already uploaded to local disk aren't migrated, but every
   new upload goes to Cloudinary from that point on. Unset any of the three to fall back to local
   disk again.

### Sending real email (Resend or SMTP)

Without any of this configured, outgoing email (invites, password resets) just logs to the server
console — fine for solo dev work, since every email still contains a real, clickable link. To
actually deliver to real inboxes, `services/email.service.js` picks a provider in this order,
restart required after changing any of it:

**1. Resend** (`RESEND_API_KEY`) — if set, this wins over everything else. Quickest to set up, but
on a free Resend account without a verified custom domain, Resend's sandbox mode can **only**
deliver to the email address that owns the Resend account itself — sending to anyone else needs a
verified domain.

**2. SMTP** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) — used only if
`RESEND_API_KEY` is unset. Works with any SMTP-compatible provider and, unlike Resend's sandbox,
isn't limited to one recipient. Two ways to get credentials without owning a domain:
- **Gmail**: turn on 2-Step Verification, generate an **App Password** (Google Account → Security
  → 2-Step Verification → App passwords), and use `smtp.gmail.com` / port `587` / your Gmail
  address / that app password.
- **Brevo** (free tier, higher volume than Gmail): `smtp-relay.brevo.com` / port `587` / the SMTP
  login and key from Settings → SMTP & API.

**The one gotcha that looks like a bug but isn't**: an SMTP send can return a clean success
(`accepted`, `250 OK, queued`) and still never actually arrive, if `SMTP_FROM` isn't a sender your
provider has verified. The provider accepts it into its queue, then silently drops it afterward —
there's no error anywhere in this app's own logs for that, since the provider itself doesn't report
one back over SMTP. Fix: verify a sender you actually control with your provider (Brevo: Senders,
Domains & Dedicated IPs → Senders → Add a Sender → click the confirmation email sent to that
address — no DNS or domain ownership needed) and point `SMTP_FROM` at that exact verified address.

## Production deployment

- Set `NODE_ENV=production`. The server refuses to boot with a weak/default/shared JWT secret in
  this mode (`config/env.js`'s own guard) — if a deploy fails at startup with that exact message,
  that's why; generate real secrets rather than reusing dev ones.
- Build and run the compiled output, not the dev servers: `cd client && npm run build` (serve the
  `dist/` output from a static host or CDN), and on the backend `npm start` (not `npm run dev` —
  skips `nodemon`).
- `sameSite` on the auth cookies automatically becomes `None` (from `Lax`) in production, which
  requires `Secure` — already conditioned on the same `NODE_ENV` check, so this only works over
  HTTPS. Plan for the app being served over HTTPS end-to-end before going live.
- If the frontend and backend end up on different registrable domains (e.g. a Vercel frontend and
  a Render backend), set `COOKIE_DOMAIN` accordingly and make sure `CLIENT_URL` lists every
  origin that should be allowed through CORS (comma-separated — see the table above).
- ForgeAI: set `GEMINI_API_KEY` on a **paid** key (see "ForgeAI" above), or leave it blank to ship
  without AI.
- Point `MONGODB_URI` at your production Atlas cluster (see "Swapping to MongoDB Atlas") and set
  real `RESEND_API_KEY`/`CLOUDINARY_*`/`GOOGLE_CLIENT_ID` values as needed.

## Project structure

```
server/src/   config, constants, models, middleware, controllers, services, routes,
              validators, utils, seed
client/src/   styles, lib, services, features/<domain>, components/ui, layouts,
              pages, routes, hooks, utils
```
