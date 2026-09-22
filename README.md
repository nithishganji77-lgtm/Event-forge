# EventForge

Corporate event management platform — MERN stack, built in phases. See
`/Users/nithish/.claude/plans/eventforge-full-stack-giggly-rossum.md` for the full build plan.

**Status:** Phase 1 complete (project setup, design system, database, authentication).
Organizations/members/RBAC, events/registration, dashboards/calendar/analytics, and
notifications/audit/search are not built yet.

## Stack

- **Backend:** Express 5, Mongoose, JWT (httpOnly cookies), Zod validation, Cloudinary/local-disk
  storage adapter, Pino logging.
- **Frontend:** React 19, Vite, React Router, TanStack Query, React Hook Form + Zod, Tailwind v4,
  Framer Motion, Lucide icons.
- **Database:** MongoDB (local for dev; swap `MONGODB_URI` to an Atlas URI for production — no
  code changes needed).

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

## Environment variables

See `server/.env.example` and `client/.env.example` for the full list with descriptions.
Notably: image uploads and email both work without any third-party account in dev (local-disk
storage, console-logged emails) and pick up real Cloudinary/SMTP credentials automatically the
moment those env vars are set — no code changes required either way.

## Project structure

```
server/src/   config, constants, models, middleware, controllers, services, routes,
              validators, utils, seed
client/src/   styles, lib, services, features/<domain>, components/ui, layouts,
              pages, routes, hooks, utils
```
