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
```

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

### Event status: stored vs. derived

`Event.status` only ever gets *written* `DRAFT`, `PUBLISHED`, or `CANCELLED`. The other four
values the schema's enum allows (`REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `ONGOING`,
`COMPLETED`) are computed live at read time (`server/src/utils/eventStatus.js:
computeDisplayStatus`) from `startDate`/`endDate`/`registrationDeadline`, and merged onto every API
response as `event.displayStatus`. This avoids depending on a cron job to advance events through
their lifecycle, with zero staleness risk — the one cron job the app does have (Phase 5's deadline
reminder) only sends notifications, it never mutates `status`. Capacity-full is a **separate,
independent** condition — `displayStatus` stays `REGISTRATION_OPEN` even when an event is full;
the register button offers "join waitlist" instead.

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

## Known issues found and fixed (so they don't recur)

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
  calendar (Week view deliberately cut — `startTime`/`endTime` are free-text strings, not
  structured enough for hour-grid layout), org- and event-level analytics with `recharts` charts,
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
- **Phase 7 (testing, security, production config, polish)** — not started. See the plan file for
  its detailed design.

Demo login: `ava@eventforge.dev` / `Demo@1234` (from `npm run seed`).
