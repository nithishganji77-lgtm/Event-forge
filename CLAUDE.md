# EventForge

A B2B corporate event management SaaS — MERN stack, built end-to-end in phases. This file is the
persistent source of truth for the project's architecture, decisions, and status, so future work
doesn't depend on chat history being available. The full phase-by-phase implementation plan (file
lists, route tables, exact schemas) lives at
`/Users/nithish/.claude/plans/eventforge-full-stack-giggly-rossum.md` — this file is the
higher-level summary; that one is the detailed reference.

## What this is

EventForge lets companies create organizations, invite employees, assign roles, create events,
publish them, and let employees register (with capacity/waitlist handling). Built from a 58-section
product spec covering visual identity, auth, RBAC, events, registration, dashboards, calendar,
analytics, notifications, and audit logs. Being built in phases — each phase ends in a fully
working, connected slice (no disconnected mock screens, no hard-coded fake data).

## Stack

- **Backend:** Node/Express 5 + Mongoose (MongoDB), JWT access+refresh tokens in httpOnly cookies
  (never localStorage), Zod validation, Pino logging.
- **Frontend:** React 19 + Vite, React Router 7, TanStack Query, React Hook Form + Zod, Tailwind
  v4, Framer Motion, Lucide icons.
- **Database:** MongoDB — local (`mongodb://localhost:27017/eventforge`) for dev; swap
  `MONGODB_URI` to an Atlas URI for production, no code changes needed.
- **Email:** Resend (transactional API) if `RESEND_API_KEY` is set, else SMTP if configured, else
  console-log fallback — same `sendEmail()` call site regardless.
- **Images:** Cloudinary if configured, else local-disk storage under `server/uploads/` — same
  `storage.upload()`/`storage.remove()` call site regardless.
- **AI (optional):** Google Gemini via `@google/genai` — ForgeAI, an event copilot. Only
  `server/src/services/ai/gemini.client.js` imports the SDK. No key = feature off, app unaffected.
- **Auth:** email/password plus Google Sign-In (`@react-oauth/google` + `google-auth-library`,
  ID-token verification, no client secret needed). The Google button is hidden entirely when
  `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` aren't set.

JavaScript, not TypeScript (matches the original spec's own file examples).

## Running locally

```bash
# Backend
cd server && npm install && npm run dev        # http://localhost:4000 (not 5000 — see below)

# Frontend
cd client && npm install && npm run dev        # http://localhost:5175 (or next free port)

# Seed demo data
cd server && npm run seed                       # prints demo login credentials
cd server && npm run seed:demo                  # "Northwind Events": 4 role users, 14 events in every
                                                # state, registrations, invites, audit history.
                                                # `-- --reset` recreates it. Dates are relative to the
                                                # moment it runs, so re-seed before a demo.
cd server && npm run ai:check                   # which Gemini models the key can call + one tiny request
cd server && npm test                           # jest; `npm run test:tz` also runs it under UTC and
                                                # America/Los_Angeles (this machine is IST)
cd client && npm test                           # vitest
```

**Dev rate limits:** `authLimiter` is 20 requests / 15 min per IP (register, login, refresh) and
`apiLimiter` 300 / 15 min, both in memory. Scripted browser runs hit them fast; a `touch
server/src/server.js` (nodemon restarts) clears them. Both are skipped under `NODE_ENV=test`.

Env vars are documented in `server/.env.example` and `client/.env.example`. Real credentials
(Cloudinary, Resend, Google) live only in the untracked `.env` files, never committed.

**macOS gotcha:** ports 5000/5173/5174 are commonly already taken (AirPlay Receiver, other local
projects) — the API defaults to port 4000 and the client's `CLIENT_URL`/CORS config must match
whatever port Vite actually lands on. If a stale/orphaned `npm run dev` from an earlier session is
still holding 5175, a fresh one silently lands on 5176+ instead — check `lsof -nP -iTCP -sTCP:LISTEN
| grep node` and the process's cwd if unsure which port the *current* client is actually on.

**Google Sign-In "Error 400: origin_mismatch"**: Google checks the exact origin (protocol+host+port)
the sign-in popup was opened from against the OAuth Client's **Authorized JavaScript origins** list
in Google Cloud Console — this is a Google-side allow-list, separate from `GOOGLE_CLIENT_ID`/
`VITE_GOOGLE_CLIENT_ID` matching (which was never the issue) and from the server's own CORS config.
Whenever the client lands on a different port than usual (see the gotcha above), that new origin
(e.g. `http://localhost:5176`) needs to be added to the Console's origins list too, or Google
blocks the sign-in outright before it ever reaches this app's code. No code-side fix exists for
this — it's a manual step in Google Cloud Console every time the port drifts.

## Architecture

### RBAC

Four roles, org-scoped (no platform-wide role — `SUPER_ADMIN` is an organization's owner, not
staff across all orgs): `SUPER_ADMIN`, `ORG_ADMIN`, `ORGANIZER`, `EMPLOYEE`. Permissions are
granular constants (`server/src/constants/permissions.js`, mirrored client-side in
`client/src/utils/permissions.js` for UX-only gating — the backend is always the real
authority). `OrganizationMember.permissions[]` stores **additive overrides only** on top of the
role's default set — a custom grant never requires inventing a new role.

Middleware chain for every protected route: `authenticate → validate(params/body) → orgContext (or
eventContext) → requirePermission(...) → [requireEventOwnership] → controller`. `orgContext`
resolves org membership from `:orgId` in the URL; `eventContext` does the same from `:eventId`
for the flat `/events/:id` routes where org isn't in the URL (resolved via `event.organization`).

Events specifically add an **ownership layer** on top of permissions: a plain `ORGANIZER` can only
update/cancel/delete/duplicate events they created or are listed as an organizer on —
`SUPER_ADMIN`/`ORG_ADMIN` bypass this. The bypass is role-based, not permission-based, since
permission overrides are additive (an `EMPLOYEE` custom-granted `EVENT_UPDATE` should still be
ownership-scoped, not treated as admin-equivalent).

### Event time and status: stored vs. derived

**Instants.** `startDate`/`endDate`/`registrationDeadline` are the *calendar date the organizer
picked*, stored at UTC midnight; `startTime`/`endTime` are validated `HH:mm` wall-clock strings (or
`''`) in `event.timezone`. A `pre('validate')` hook on `Event` derives three persisted instants —
`startsAt`, `endsAt`, `registrationClosesAt` — so every write path (create, save, publish, duplicate,
the reminder cron) is covered by one place. Precedence: (1) a time is set -> UTC Y-M-D + that time in
the zone; (2) no time, but the date carries a UTC time-of-day -> it *is* the instant (legacy rows and
test fixtures); (3) otherwise start / end (23:59:59.999) of the day in the zone. So an event with no
time is "all day", and `registrationClosesAt` is the end of the deadline's day in the event's zone.
`server/src/utils/eventTime.js` does the zone maths with `Intl` only, using a candidate-offset
algorithm (the naive two-pass conversion is wrong in DST gaps). Validate zones by constructing an
`Intl.DateTimeFormat`, **not** `Intl.supportedValuesOf`, which omits `Asia/Kolkata` and `UTC` on
current Node. `backfillEventTimes()` (run at boot and via `npm run backfill:event-times`) fills the
instants on older rows.

**Status.** `Event.status` only ever gets *written* `DRAFT`, `PUBLISHED`, or `CANCELLED`. The other
four values the schema's enum allows (`REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `ONGOING`,
`COMPLETED`) are computed live at read time (`server/src/utils/eventStatus.js:
computeDisplayStatus`) from the three instants and merged onto every API response as
`event.displayStatus`. This avoids depending on a cron job to advance events through their
lifecycle, with zero staleness risk — the one cron job the app does have (the deadline reminder,
windowed on `registrationClosesAt`) only sends notifications, it never mutates `status`.
Capacity-full is a **separate, independent** condition — `displayStatus` stays `REGISTRATION_OPEN`
even when an event is full; the register button offers "join waitlist" instead. `UPCOMING` is a
*query-only* filter alias (`PUBLISHED & startsAt > now`) in `EVENT_STATUS_FILTER_VALUES`; it is kept
out of `EVENT_STATUS` because that feeds the Mongoose enum.

**Client presentation.** `features/events/utils/presentationStatus.js` derives what a person sees
*from the server's `displayStatus`* (ONGOING -> LIVE; open/closed -> UPCOMING, or STARTING SOON with
a live "Starts in 2H 15M" countdown when the event has a start time and begins within 24h). It never
re-derives date boundaries, so it cannot disagree with `RegisterButton` or the list filters; the
client clock (`hooks/useNow.js`, one shared minute-aligned ticker) is used for the countdown only.
Dates are displayed by reading the stored calendar date in UTC (`features/events/utils/eventTime.js`).

`listEvents` composes its conditions (organizer, status fragment, date window) as separate `$and`
clauses so none overwrites another, and takes a whitelisted `sort` with an `_id` tiebreak.

### Errors

The server answers `{ success: false, error: { code, message, details } }`. `message` is always a
sentence a person can act on; for validation it is the problem itself ("Event name is required;
Capacity must be a number"), and `details` is `[{ path, message }]`, one per field, so a client can put
each next to its input. A global zod error map (`server/src/config/zodMessages.js`, field names from
`utils/fieldLabels.js`) replaces zod's developer wording; a message written on a schema still wins,
so hard-coded ones must read as sentences too. The error handler maps duplicate keys, bad ids,
multer and malformed-JSON errors to sentences (never a raw 500 for client input) and 5xx never leaks
internals.

On the client, `lib/errors.js` `getErrorInfo(error)` is the one reader: `{ kind, message, fieldErrors,
retryable }`, covering a dropped connection, a timeout, a proxy's HTML 502, a 429 with a wait time,
and never surfacing an error our own code threw. Use `extractErrorMessage` for a sentence,
`useServerFormErrors` to put server field errors on a react-hook-form form (banner only for what
isn't a field), `QueryError` for a failed load (Try again only when `retryable`), and tag a
mutation that has no form or dialog of its own with `meta: { errorToast: 'Could not do X' }` so its
failure toasts instead of vanishing. `PageErrorBoundary` (dashboard content) and the router's
`errorElement` catch crashes and stale-chunk failures. TanStack Query runs with `networkMode:
'always'` and does not retry 4xx answers.

### Dashboards and the app shell

Two dashboards, split by whether the person runs events (`ManagerDashboard`: SUPER_ADMIN, ORG_ADMIN,
ORGANIZER) or attends them (`EmployeeDashboard`). Managers get four KPIs from
`GET /organizations/:orgId/analytics/dashboard?tz=` (scoped exactly like org analytics: admins
org-wide, organizers only events they created or organize; `pendingInvites` is `null`, not `0`, when
the caller cannot manage invites), an events section with Upcoming / Drafts / Completed tabs
(`?tab=`), a "Live now" strip (a started event is in none of the tabs), a next-7-days schedule
grouped by the event's own calendar day, permission-gated quick actions, and recent activity only for
`AUDIT_READ`. Deltas are shown only when the previous month has a baseline (`formatDelta` returns
`null` for 0; a move from nothing is stated as a fact, never "+100%"). Audit rows for event and
registration actions carry `{eventId, eventTitle}` in `metadata`, written at the call site, so the
feed reads "Rahul registered for Sreeman Pelli" without a read-time join and survives a rename or
delete. A waitlist-promotion row's actor is whoever *cancelled*, so the feed does not name one.

The shell: grouped, collapsible sidebar (icon rail on desktop, persisted; the mobile drawer is never
collapsed), workspace card, user menu with a light / dark / system theme (`lib/theme.js`, key
`ef-theme`, pre-paint script in `index.html`). The rounded "soft" look is scoped to the logged-in app
by `data-shell="app"` on `<html>` (radius tokens `--ef-radius` / `--ef-radius-sm`; Tailwind reserves
`--radius-*`); landing and auth stay square. Route-level access: `RequireAccess` wraps settings, new /
edit event, analytics and audit log so a role that reaches them by URL sees why, not a form that can
only fail.

The event page is a workspace (hero with the cover or a generated category banner, role-aware
actions with destructive ones in a "⋯" menu, stats with a progress bar, tabs: About / Venue /
Organizers / Attendees / Analytics). `GET /events/:id` adds `people` (creator + organizers as
profiles) while `createdBy` / `organizers` stay plain ids for the client's ownership checks. Not
built, because nothing behind them exists: Export attendees, Add attendee, a map preview (no provider
or key; "Get directions" opens a Google Maps search), per-event accent colour, event visibility,
organizer job titles.

### ForgeAI (Gemini event copilot)

Four tasks on one pipeline — **draft** an event from a sentence, **concepts** (3 for a vibe), **venues**
(venue *types* with a Maps search, never invented businesses) and **enhance** (professional / energetic /
invitation email). Routes: `GET /organizations/:orgId/ai/status`, `POST .../ai/{draft,concepts,venues,
enhance}`; middleware `authenticate -> validate -> orgContext -> requirePermission(EVENT_CREATE) ->
aiLimiter (10/min per user; the POSTs only, not `status`) -> controller`. The service (`services/ai/ai.service.js`, built by
`createAiService({generateJson, cache, quota, ...})` so tests inject fakes) then runs: input guardrails
-> cache -> shared quota bucket -> Gemini -> output validation -> cache store. Each stage is a small
module: `guardrails.js`, `cache.js` (LRU + TTL, and the token bucket), `prompts.js`, `schemas.js`.

*Containment, not filtering, is the defence.* The prompt filter (500 chars, 2000 for enhance; hidden
and bidi characters stripped; a narrow injection-phrase list tested against benign lookalikes; emails and
phone numbers refused) is a speed bump. What actually bounds the damage: the model has no tools and is
sent only what the person typed (never org / user / event data, which also makes the cache safe to share
across orgs); its answer is untrusted, so it is re-validated with zod (tags, URLs and hidden characters
stripped, numbers clamped, category forced into the six known ones, agenda times checked) before it is
cached or returned; and the client renders it as text. The system prompt makes off-topic requests come
back as `{status:'off_topic'}` (422 `AI_OFF_TOPIC`).

*Quota is per Google project, not per user*, so a per-user limiter alone cannot protect it:
`AI_GLOBAL_RPM` (default 12) is a shared bucket, cache hits don't spend it, and a Gemini 429 becomes
`AI_BUSY`. Other errors: `AI_DISABLED` 503, `AI_BAD_OUTPUT` 502, `AI_UNAVAILABLE` 503, `AI_TIMEOUT` 504 —
each with a sentence a person can act on; provider detail is logged (kind, model, latency, cache hit,
token counts) and **never the prompt or the answer**. No SDK retry (`attempts: 1`): a retry would burn
quota, and "Another take" / re-clicking is the person's own retry. `fresh: true` on a body skips the cache
*read* (the new answer replaces the cached one; it still spends quota).

*Privacy.* On Google's free tier prompts and responses may be used to improve its products and reviewed
by humans, and Google asks that nothing sensitive or personal be submitted. Hence: only typed text is
sent, emails/phones are refused, the panel carries a notice, and `.env.example` / README say to use a
**paid key before real customers**. The key lives in `server/.env` only; never `client/.env`.

*Client* (`features/ai/`). One `ForgeAiPanel` with four tabs (all mounted, so a result survives a look at
another tab), shown in `ForgeAiModal` (`Modal` has a `size` prop: `md` default, `xl`), opened from
`ForgeAiButton` in the header for `EVENT_CREATE` holders; the status is asked for only when it opens.
The panel and the wizard differ only in the callbacks they pass (`onUseDraft`, `onUseVenue`,
`onUseText`). The Event model has no agenda / tagline field, so `applyDraft.js` writes tagline +
description + the agenda as **text** into the description (cut at a whole line, never past 5000 chars);
the venue name is filled only if a venue idea was picked, the registration deadline only if a start date
exists and that day hasn't passed. Replacing text the person already typed is confirmed *inside* the
modal (no second dialog stacked). From the header there is no form, so "Use this draft" navigates to
`/events/new` with `state.aiDraft`, which `EventWizard` reads (known fields, right types only) as its
starting values. Editing an existing event offers only the polisher.

### Invites

A full email-invite system (`Invite` model) that can invite people who don't have an EventForge
account yet — not just add existing users. Token pattern mirrors password-reset (random raw token
emailed, SHA-256 hash stored). Joining always happens via one consenting action: an explicit
"Accept" click (existing account) or completing registration through the invite link (new
account — that registration *is* the consenting action, auto-joins with no extra click).

### Registration / waitlist

`EventRegistration`'s unique index is `{event, user}` and **not partial on status** — cancelling
and re-registering must reuse/update the same document, never insert a second one. Capacity is
enforced by counting current `REGISTERED` docs against `event.capacity`; overflow lands
`WAITLISTED`. Cancelling a `REGISTERED` slot auto-promotes the earliest `WAITLISTED` doc.

### Analytics scoping

`ANALYTICS_READ` for `ORGANIZER` is "own events only" (same `createdBy`/`organizers[]` ownership
definition as `requireEventOwnership`, applied as a service-layer `scopeToUserId` param rather
than a middleware, since org-level analytics isn't tied to one event); `SUPER_ADMIN`/`ORG_ADMIN`
see the org-wide total. Attendance rate and cancellation rate return `null` (not `0`) when there's
no meaningful denominator yet — the UI renders an explicit "not enough data" state instead of a
misleading percentage. Nothing sets `EventRegistration.attendanceStatus` away from `PENDING`
except the dedicated `PATCH /events/:eventId/registrations/:registrationId/attendance` endpoint
(same `REGISTRATION_MANAGE` + ownership gate as viewing the attendee list), surfaced as a control
in the Attendees tab.

### Notifications

`Notification` is a separate collection from `AuditLog` — audit logs are the admin-facing "what
happened" record (written by `writeAuditLog`, one row per mutation, actor-centric); notifications
are the end-user-facing "what should I know about" inbox (written by `notify()` in
`services/notification.service.js`, same never-throws defensive posture as `writeAuditLog`, fans
out to N recipients via `insertMany`). A triggering action never writes both an audit row *and* N
notification rows for the same event — that would explode row counts on fan-out (e.g. one publish
notifying 30 members) and misrepresent `AuditLog.actor` as "who was told," not "who did it."

Audience is trigger-specific, not "notify the whole org" by default: event published → every
active member except the actor (an announcement); event updated/cancelled → only people with an
active registration for *that* event, not everyone; registration confirmed/waitlisted/cancelled →
the acting user only, including a `promotedFromWaitlist` variant reused from the existing
cancel-registration auto-promotion flow; deadline-approaching (cron-triggered) → active members who
do *not* already hold an active registration — reminding someone who's already registered has
nothing for them to act on. Every trigger's `relatedEntityType`/`relatedEntityId` points at the
`Event`, even for registration-related notifications, since there's no standalone page for a single
`EventRegistration` to link to.

The one background job in the app (`jobs/deadlineReminder.job.js`, `node-cron`, started in
`server.js` right after `connectDB()`, stopped during graceful shutdown) finds published events
whose `registrationDeadline` falls within `DEADLINE_REMINDER_WINDOW_HOURS` and haven't been
reminded yet (`Event.deadlineReminderSentAt`, an idempotency guard stamped after a successful
tick — same no-transactions tradeoff as everywhere else in this codebase, so the only race is a
harmless double-send on overlapping ticks, not a data-integrity issue).

### Mobile navigation, focus management, and code splitting

Below `lg` (1024px) the desktop `<aside>` sidebar is `hidden`; a hamburger toggle (first child of
the header, `lg:hidden` — the exact inverse breakpoint) opens `layouts/MobileNavDrawer.jsx`, an
edge-anchored slide-in drawer. It's a **separate component from `Modal`, not a variant prop on
it** — a drawer's shape (full-height, horizontal-slide) is genuinely different from Modal's
(centered, width-capped, vertical-slide), matching the project's standing "don't force one
abstraction onto genuinely different shapes" rule (see the `FilterBar`/`queryFilters.js`
rejections above). What IS shared — Escape-to-close, Tab-focus-trap, initial-focus, focus-return —
lives in two small hooks (`hooks/useEscapeKey.js`, `hooks/useFocusTrap.js`) both `Modal.jsx` and
`MobileNavDrawer.jsx` call, so the only real duplication between them is JSX layout. Both the
desktop `<aside>` and the drawer render the same `layouts/SidebarNav.jsx` for their RBAC-gated nav
list — one source of truth, no permission-logic drift between the two surfaces.

`OrgSwitcher`/`NotificationBell`'s dropdowns are deliberately *not* given the full `useFocusTrap`
treatment (they're non-modal popovers per the ARIA APG disclosure pattern, not true dialogs) — just
`useEscapeKey` plus a couple of inline lines to refocus their trigger button, and only on
Escape-close specifically (click-outside/option-select already have their own next focus target,
so forcing a refocus there would fight the user's actual click).

All 20 page components in `routes/AppRouter.jsx` are `React.lazy()`-loaded (all named exports, so
each needs the `.then(m => ({default: m.X}))` remap) behind three `<Suspense fallback={<Spinner/>}>`
boundaries (`GuestRoute`, `ProtectedRoute`, and `DashboardLayout`'s `<main>` — nested, so navigating
within the dashboard only shows the fallback in the content area, not a full-page flash). This took
the single main bundle from 1,102.86 kB/329.04 kB gzip down to a 398.06 kB/124.13 kB gzip entry
chunk, with `recharts` (analytics-only, the heaviest dependency) landing in its own ~356 kB chunk
via Rollup's default splitting — no manual `vite.config.js` chunk tuning needed.

## Judgment calls made along the way (flagging for visibility)

- Two additive `User` fields beyond the spec's literal list: `refreshTokenVersion` (refresh
  rotation/revocation) and `passwordResetToken`/`passwordResetExpires` (forgot/reset-password).
  Later, `googleId` (sparse+unique, **no `default: null`** — see Known Issues Fixed below).
- `express-mongo-sanitize` is unmaintained and breaks on Express 5 (`req.query` is a getter) —
  replaced with a custom body/params sanitizer + strict Zod query schemas everywhere.
- `bcryptjs` over native `bcrypt` (no native-binding ABI risk on a very new Node version).
- Extra permissions beyond the spec's literal list: `ORGANIZATION_DELETE`, `REGISTRATION_MANAGE`.
- SUPER_ADMIN is org-scoped (lives on `OrganizationMember.role`), confirmed with the user rather
  than assumed, since the given model list has no platform-wide role field anywhere.
- Invites: the user explicitly chose the fuller "true email invite" design (new `Invite` model)
  over the simpler "require an existing account first" alternative.
- Event wizard consolidated to 5 real steps, not the spec's 7 named ones — 2 of the 7 (REGISTRATION,
  PUBLISH) have no distinct fields assigned to them in the spec's own detailed breakdown; faking
  2 empty wizard screens would be worse UX than just not building them.
- Event detail page skips a "Schedule" tab (no sub-schedule model exists) and "Export" (no CSV
  service built yet) — both explicitly cut and flagged rather than faked with dead buttons.
- No `utils/queryFilters.js` shared abstraction (Phase 5's original placeholder text proposed one)
  — Members, Events, and now Audit Logs each hand-write their own inline filter object with
  genuinely different fields/search targets; extracting now would be abstraction before it's
  earned. Same reasoning applied to not building a generic `FilterBar` component.

- Redesign scope (dashboard + app shell + event page): soft look inside the app only, Inter kept,
  cover image else a generated category banner (no stock imagery), the status bug fixed properly
  (persisted instants, not a client patch). Out: global search / ⌘K, mobile bottom nav, CSV
  import/export, Profile / Preferences / Help pages, renaming Members -> "Attendees".

## Known issues found and fixed (so they don't recur)

- **Gemini free-tier facts change; don't hard-code them.** `gemini-2.0-flash` / `1.5-flash` are shut
  down, free-tier limits are no longer published (see AI Studio), and the SDK's primary API moved. The
  model is `GEMINI_MODEL`, `npm run ai:check` is the source of truth, and everything SDK-specific is in
  `gemini.client.js`.
- **A polisher will strengthen wording unless told not to.** "everyone should come" came back as
  "Attendance is mandatory". The enhance prompt now pins meaning and strength (found in a live run, not
  by a test; the test pins the instruction, not the model).
- **A `fetch failed` from Gemini is a network blip on the machine, not a rejected request.** It becomes
  `AI_UNAVAILABLE` and the panel shows the friendly banner; check the server log (`providerKind`,
  `message`) before assuming the request is wrong.
- **The header's ForgeAI modal is still in the DOM while it fades out.** It lives in `DashboardLayout`,
  which persists across navigation, so a test or script that navigates right after "Use this draft" must
  wait for the dialog to detach before querying the wizard (duplicate labels such as "Category" otherwise).

- **An unlayered `* { border-color }` beat every Tailwind border utility.** It sat outside
  `@layer`, so it won over `border-*` colour utilities (active-nav bar, hover borders, invalid-input
  borders were silently dead). Now inside `@layer base`. `.text-meta` is still unlayered and forces
  uppercase: never use it for sentence-case titles.
- **`cn()` is plain `clsx`, not `tailwind-merge`.** Two competing utilities (`text-a` + an override)
  are both emitted and stylesheet order, not class order, picks the winner. Choose exactly one class
  per property instead of adding an override (this hid every destructive menu item's colour).
- **Tailwind v4 moves elements with the `translate` property, not `transform`.** A hover lift with
  `transition-[transform,...]` snaps; list `translate`.
- **`z.string().url()` accepts `javascript:` and `data:`.** A venue map link is rendered as an
  `<a href>`, so an organizer could plant script that runs in a viewer's session. Use `httpUrl`
  (`validators/common.js`) for any URL that is stored and later rendered; the client renders links
  through `safeHttpUrl` too.
- **A missing import shipped because nothing tested the route.** `invite.service.js` called
  `toSkipLimit` without importing it, so the pending-invites list 500'd for every org after the
  Phase 7 refactor. Only opening every page with a fresh account found it. Every list endpoint now has
  a route-level test; prefer those over service-only tests for list endpoints.
- **TanStack Query pauses requests while the browser is offline** (`networkMode: 'online'`, the
  default) and waits silently, so a lost connection looked like a blank page: no spinner, no error.
  The app sets `networkMode: 'always'` so requests fail into "We can't reach EventForge" with Try
  again, and shows an offline banner.
- **Mongoose validates every loaded path on `save()`**, not just modified ones: validators on fields
  that can hold legacy values (`timezone`, `endsAt`) must self-gate on `isNew` / `isModified`, or an
  unrelated save (the reminder cron) fails on an old row.
- **Backfills must not touch other projects' rows.** The dev DB is shared; the backfill restricts to
  `status: {$in: EVENT_STATUS_VALUES}`.
- **Node's experimental built-in `localStorage` shadows jsdom's** in Vitest (no `clear()`); tests
  install an in-memory `Storage`. App code wraps every storage access in try/catch.
- **Extreme dates in a request body** (`z.coerce.date()` accepts them) can make the `Intl` offset
  lookup in the pre-validate hook throw a `RangeError`, surfacing as a 500 rather than a 400. Not yet
  bounded in the validator.

- **Sparse unique index + `default: null`**: `User.googleId` originally had `default: null`, which
  writes an explicit `null` onto every local-auth user — a sparse index only excludes fields that
  are truly *absent*, not explicitly `null`, so the second such user collided on a duplicate key.
  Fixed by removing the default entirely.
- **Resend SDK error handling**: `resend.emails.send()` resolves `{data, error}` instead of
  throwing on API-level failures (e.g. sandbox-mode rejecting a non-owner recipient) — the
  original code awaited the call and reported `delivered: true` regardless. Fixed to check
  `error` and throw.
- **TanStack Query invalidation races**: `useCreateOrganization`/`useDeleteOrganization` (and
  later, the event wizard's publish flow) needed the memberships/events cache to actually be
  updated *before* the following `navigate()` call, not just kicked off — fixed by returning the
  invalidation promise so the mutation's second `onSuccess` callback awaits it.
- **Hook rules**: a cover-image upload component briefly called `useMutation` conditionally based
  on a prop — fixed to call the hook unconditionally and gate only the `.mutate()` call.
- **Axios 401 interceptor over-triggering**: the refresh-retry interceptor was hard-redirecting to
  `/login` on any failed refresh, which fired even for anonymous visitors on public pages (they
  legitimately get a 401 from `GET /auth/me`). Fixed by removing the forced navigation —
  `ProtectedRoute` already owns real redirect decisions via client-side routing.
- **Stale mutation closures**: a "create-then-publish" flow tried to reuse a mutation hook that
  had closed over an event id that didn't exist yet at hook-creation time (create mode). Fixed by
  calling the underlying service function directly for that one flow instead of through the hook.
- **Incomplete stats attachment**: `listMyEvents` populated each registration's `event` but never
  ran it through the same `displayStatus`/`registeredCount` attachment every other event-returning
  endpoint uses — `EventCard` would render undefined values specifically for "my events." Fixed by
  exporting and reusing `event.service.js`'s `attachStats`.
- **CSS custom properties don't reliably resolve as recharts' `fill`/`stroke` prop values** — they
  become a plain SVG presentation attribute (`fill="var(--chart-accent)"` verbatim), which doesn't
  paint even though the geometry renders correctly (confirmed via DOM inspection: correct `<path>`
  bbox, `opacity:1`, `visibility:visible`, just no color). Gridline `stroke` on `CartesianGrid`
  worked fine with the same variable — this is specifically a `Bar`/mark-fill gap, not a blanket
  "CSS vars break in recharts" rule. Fixed by resolving light/dark hex literally in JS
  (`getChartAccentColor()`, keyed off `prefers-color-scheme`) rather than passing a CSS variable
  into chart mark props.
- **`z.coerce.boolean()` on a query string param**: `listMyNotificationsQuerySchema`'s `unreadOnly`
  used `z.coerce.boolean()`, which runs the raw query string through JS's `Boolean(...)` —
  `Boolean("false")` is `true` (any non-empty string is truthy), so `?unreadOnly=false` was
  silently coerced to `true`. The Notifications page's "ALL" tab explicitly sends
  `unreadOnly=false` and was actually only ever returning unread notifications. Caught by comparing
  the notification dropdown panel (which omits the param entirely, so it was unaffected) against
  the dedicated page's "ALL" tab in a Playwright screenshot — a read notification visible in the
  panel was missing from the page's "ALL" list, which should never happen. Fixed by replacing the
  coercion with `z.enum(['true','false']).transform(v => v === 'true')`, which only recognizes the
  literal string `"true"`. Worth checking for this same pattern before adding any other boolean
  query param in a later phase.
- **`lottie-react`'s imperative handle is a separate `lottieRef` prop, not the standard `ref`**:
  passing the ref as `ref` compiled without error but crashed the entire app under
  `prefers-reduced-motion: reduce` (`TypeError: lottieRef.current?.stop is not a function`,
  swallowed by React Router's default error boundary into a generic "Unexpected Application
  Error!" on every route). Root-caused by reading the library's compiled source: the installed
  3.x rewrite wires `useImperativeHandle` to a named `lottieRef` prop, destructured separately
  from the forwarded `ref` (which instead forwards to the rendered DOM element). Fixed by renaming
  the prop in `Spinner.jsx`.
- **jsdom has no `<canvas>` 2D context, and `lottie-web` touches one at import time**: crashed
  every Vitest file that mounted `Spinner` even indirectly (route guards' loading state, the event
  wizard's Organizers step) with `TypeError: Cannot set properties of null (setting 'fillStyle')`.
  Installing the native `canvas` package just for tests wasn't worth it for a component that's
  fully stubbed anyway. Fixed with a global `vi.mock('lottie-react', ...)` in `client/tests/
  setup.js`, same category of fix as isolating `OrgLayoutRoute`'s test from `DashboardLayout`'s
  internals.
- **A real `.env`'s live `VITE_GOOGLE_CLIENT_ID` leaking into frontend tests**: `LoginForm`
  renders `GoogleAuthButton` whenever the client ID is set, which it is in this project's real
  (untracked, live-credentialed) `.env` — crashed with "must be used within GoogleOAuthProvider"
  since the test renders `LoginForm` standalone. Same category as the backend suite's
  `RESEND_API_KEY` dotenv-leak fix: don't let real third-party config bleed into tests. Fixed with
  `client/.env.test` blanking the var, so Vite's mode-based env loading makes tests run as if
  Google Sign-In isn't configured.
- **React 19 StrictMode's dev-only double-mount looks like a bug in a naive test, isn't one**:
  verifying `Modal`'s new focus-return-on-close behavior, a Playwright check that captured a
  button element reference right as it first appeared, then compared it after a round trip through
  a dialog open/close, reported a mismatch. Root cause: StrictMode intentionally mounts every
  component twice in development (mount → unmount → remount, to catch missing effect cleanup),
  which genuinely replaces the DOM node once, confirmed via a `MutationObserver` (~85ms after first
  appearing, then stable). The test had captured its "before" reference during that transient
  window. Not an app bug — production builds don't run StrictMode's double-mount. Fix was in the
  test (settle past the one-time remount before capturing any element reference), not the app.

## Status

- **Phase 1 (auth, design system, DB)** — complete and verified.
- **Phase 2 (organizations, members, RBAC, invites, Google sign-in, real email)** — complete and
  verified. Google/Resend are live with real credentials.
- **Phase 3 (event CRUD, lifecycle, registration)** — complete and verified, including a full
  headless-browser walkthrough of the 5-step event wizard, registration, waitlist promotion, and
  ownership-scoped RBAC.
- **Phase 4 (dashboards, calendar, analytics)** — complete and verified: role-aware dashboards
  (Admin/Organizer/Employee, each with real composed data, no fake numbers), a Month+Agenda
  calendar (Week view deliberately cut. When it was written `startTime`/`endTime` were free text;
  they are now validated `HH:mm`, so it is buildable if wanted), org- and event-level analytics with `recharts` charts,
  and attendance marking feeding a real (not hardcoded) attendance rate.
- **Phase 5 (notifications, audit log browser, search/filter/pagination)** — complete and
  verified: a real in-app notification inbox (bell + dropdown + dedicated page) driven by 7
  trigger-specific audiences, a `node-cron` deadline-reminder job verified idempotent by running
  two ticks directly against the dev DB, and the full paginated/searchable/filterable audit-log
  browser Phase 4 deliberately deferred to this phase. One real bug found and fixed (see Known
  Issues above — `z.coerce.boolean()` footgun on the `unreadOnly` query param).
- **Phase 6 (responsive, animation, accessibility, performance)** — complete and verified: a
  mobile nav drawer (the app was previously unusable below 1024px), progressive column-hiding on
  all 5 tables, `focus-visible` rings restored on `Input`/`Select`/`Textarea`, a generalized
  `FormField` that now wires validation errors for `Select`/`Textarea` fields too, `Tabs` with
  `aria-controls`/`role="tabpanel"`/roving-tabindex keyboard nav, a skip link, `Modal`'s
  focus-return-on-close gap closed, bounded Framer Motion additions (route fade, list mount fade,
  dropdown open/close), and route-level code splitting via `React.lazy` — confirmed via a real
  `vite build` (see above) and a full Playwright pass at both desktop and mobile viewports across
  every prior phase's golden path (this phase touches foundational shared components, so
  regression coverage was broader than usual). No app bugs found — one investigation (see Known
  Issues) resolved as a test-timing artifact from React StrictMode, not a defect.
- **Phase 7 (testing, security, production config, polish)** — complete and verified. Backend:
  `jest` + `supertest` + `mongodb-memory-server`, 8 files / 52 tests covering auth, the RBAC
  permission matrix (including the ownership-bypass-isn't-permission-based case), event lifecycle
  guard rails, registration/waitlist (including a direct-Mongo `E11000` proof the `{event,user}`
  index is non-partial), pagination, and named regressions for 3 previously-documented bugs.
  Frontend: `vitest` + `@testing-library/react` + `msw`, 8 files / 32 tests covering
  `RequirePermission`, the client/server permission-matrix drift guard, `LoginForm`, `ProtectedRoute`/
  `GuestRoute`, `OrgLayoutRoute`'s redirects, the axios 401→refresh→retry interceptor (including
  single-flight concurrent 401s), the 5-step `EventWizard` (per-step validation and the Phase-3
  stale-event-id regression), and `RegisterButton`'s full branch matrix — MSW intercepts at the
  network layer so the real interceptor runs under test, not a mock. `toSkipLimit` (dead since
  Phase 2) is now wired into all 6 list services. Production-readiness fixes: CORS now checks a
  comma-splittable `clientOrigins` allowlist via a function (was a static single-origin string);
  cookie `sameSite` is `isProduction ? 'none' : 'lax'` (was hardcoded `'lax'`, which would've
  silently blocked the auth cookie on any cross-site production deployment); stale `PORT`/
  `SERVER_BASE_URL` zod defaults (5000→4000) fixed; `DEADLINE_REMINDER_CRON`/
  `_WINDOW_HOURS` documented in `.env.example`. Both fixes verified live (not just read), including
  against a throwaway `NODE_ENV=production` instance on a scratch DB. README restructured (real
  status, "Running tests", Atlas/Cloudinary/production-deployment walkthroughs) and given a logo.
  The `security-review` skill ran against the full baseline-vs-Phase-7 diff and returned zero
  findings — the new CORS allowlist and the relaxed cookie `sameSite` were specifically checked
  together for a bypass and confirmed to compensate for each other correctly across the current
  route table (all mutations are `POST`/`PATCH`/`DELETE`, none `GET`). Company logo (`client/
  public/logo-mark.png`, cropped from a supplied source PNG) and a Lottie loading-spinner animation
  (`client/src/assets/loading.json` via `lottie-react`'s `LottieLight`, reduced-motion-aware) were
  also added this phase — see Known Issues above for two real bugs each of those surfaced.

- **Post-Phase-7 redesign** — complete and verified, one commit per workstream: time-aware event
  lifecycle (persisted instants, DST-safe, backfill, filters that compose), the dashboard summary
  endpoint and audit titles, the border-layer fix, in-app surface / radius tokens and a
  light / dark / system theme, the app shell, banner event cards with honest status and a "⋯" menu,
  role-aware manager and employee dashboards, and the event page as a workspace. Verified in real
  browsers at 1440 and 390 in light, dark and reduced motion, for admin / organizer / employee on
  `seed:demo` data plus a brand-new account through every empty state and the full wizard. That pass
  found and fixed two pre-existing bugs (the invites 500, and role-blocked pages that were still
  reachable by URL) and a stored-link XSS vector. Tests: server 125, client 244; the server suite
  also passes under `TZ=UTC` and `TZ=America/Los_Angeles`. `security-review` ran twice (backend
  lifecycle + summary endpoint, then the whole redesign diff including the frontend) and returned
  zero findings; the stored-link vector above was fixed before the second run, not found by it.

- **ForgeAI (Gemini event copilot)** — complete and verified, in four commits (server pipeline,
  `fresh`, client panel + header button, wizard integration) plus a prompt fix. Server 259 tests, client
  362. Verified live with a real free-tier key in a browser at 1440 (light and dark) and 390: draft
  (4 s; the identical repeat 54 ms from the cache), concepts, venues, polish and invitation email, the
  header -> wizard prefill (name, category, description with agenda, venue name, capacity; the deadline
  correctly blank when no start date exists), an injection attempt and a phone number refused before
  reaching Google, an off-topic request refused (422), the disabled state, and exactly 10 requests
  accepted then a friendly 429 (using cached repeats, so no quota). One provider error seen
  (`fetch failed`) degraded to the banner. See "Known issues" for what the live run taught.

**Not done / not requested:** pushing the git history to the configured `origin` remote
(`nithishganji77-lgtm/Event-forge`) — nothing has been pushed. The per-IP `apiLimiter` (300 / 15 min)
will bite an office of many people behind one NAT address; keying it by user is a possible follow-up.

Demo login: `ava@eventforge.dev` / `Demo@1234` (from `npm run seed`). `npm run seed:demo` adds
`demo.admin` / `demo.orgadmin` / `demo.organizer` / `demo.employee` `@eventforge.dev`, same password,
in the "Northwind Events" organization.
