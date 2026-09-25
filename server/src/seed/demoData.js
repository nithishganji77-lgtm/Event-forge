import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { connectDB, disconnectDB } from '../config/db.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { Invite } from '../models/Invite.js';
import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { registerUser } from '../services/auth.service.js';
import { createOrganization } from '../services/organization.service.js';
import { createEvent, publishEvent, cancelEvent } from '../services/event.service.js';
import { registerForEvent, markAttendance } from '../services/registration.service.js';
import { eventAuditMetadata } from '../services/audit.service.js';
import { notifyEventPublished, notifyRegistrationConfirmed, notifyRegistrationWaitlisted } from '../services/notification.service.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';
import { ROLES, MEMBER_STATUS } from '../constants/roles.js';
import { INVITE_STATUS } from '../constants/inviteStatus.js';
import { ATTENDANCE_STATUS, REGISTRATION_STATUS } from '../constants/eventStatus.js';

// A populated demo organization for looking at the UI: events in every state (draft, starting soon,
// live, completed, cancelled, full with a waitlist, registration closed; with and without a cover),
// registrations spread over two months so month-over-month deltas are real, pending invites, audit
// history and a few notifications.
//
//   npm run seed:demo             create it (no-op if it already exists)
//   npm run seed:demo -- --reset  delete the demo organization and users first, then recreate
//
// Everything goes through the same service functions the controllers use, so the data obeys the
// real rules (an event has to be future and published to take registrations). The only raw writes
// are the ones that have to bend those rules: moving an event into the past so it is LIVE or
// COMPLETED, backdating registration and audit timestamps, and expiring a registration deadline.
// Refuses to run in production.

const RESET = process.argv.includes('--reset');
const PASSWORD = 'Demo@1234';
const ORG_NAME = 'Northwind Events';
const TZ = 'Asia/Kolkata'; // no DST, so a fixed +05:30 offset below is exact

const H = 3_600_000;
const D = 24 * H;
const NOW = Date.now();

const email = (local) => `${local}@eventforge.dev`;
const ROLE_USERS = [
  { key: 'admin', name: 'Riya Kapoor', email: email('demo.admin'), role: ROLES.SUPER_ADMIN },
  { key: 'orgAdmin', name: 'Kabir Rao', email: email('demo.orgadmin'), role: ROLES.ORG_ADMIN },
  { key: 'organizer', name: 'Arjun Mehta', email: email('demo.organizer'), role: ROLES.ORGANIZER },
  { key: 'employee', name: 'Sneha Iyer', email: email('demo.employee'), role: ROLES.EMPLOYEE },
];
const ATTENDEE_NAMES = [
  'Meera Nair', 'Rohan Desai', 'Ananya Rao', 'Vikram Singh', 'Isha Kulkarni', 'Aditya Joshi',
  'Pooja Menon', 'Karan Malhotra', 'Divya Reddy', 'Nikhil Bose', 'Tanvi Shah', 'Harsh Vora',
  'Lakshmi Pillai', 'Sameer Khan', 'Neha Gupta', 'Rahul Verma', 'Shruti Iyer', 'Manish Patel',
  'Aarav Sethi', 'Kavya Menon', 'Yash Agarwal', 'Ritu Bansal', 'Dev Chawla', 'Simran Kaur',
];

const wallFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
function wall(ms) {
  const p = Object.fromEntries(wallFormat.formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
const atWall = (dayOffset, time) => Date.parse(`${wall(NOW + dayOffset * D).date}T${time}:00+05:30`);
const utcMidnight = (dateKey) => new Date(`${dateKey}T00:00:00.000Z`);

// day: whole days from today (negative = past). `kind` covers the two that depend on "right now".
const SPECS = [
  { title: 'Product Launch Webinar', category: 'Webinar', owner: 'admin', venue: 'Online · Zoom', capacity: 300, kind: 'starting', signups: 7, cover: 'launch',
    description: 'A walkthrough of what is shipping this quarter, with live Q&A.' },
  { title: 'Design System Workshop', category: 'Workshop', owner: 'organizer', venue: 'Studio 3, Bengaluru HQ', capacity: 12, day: 1, time: '14:00', hours: 3, signups: 15,
    description: 'Hands-on session on the component library. Bring a laptop.' }, // full + 3 waitlisted
  { title: 'Compliance Refresher', category: 'Webinar', owner: 'organizer', venue: 'Online', capacity: 50, day: 4, time: '11:00', hours: 1, signups: 6, registrationClosed: true,
    description: 'Annual refresher. Registration has closed; the recording follows.' },
  { title: 'Onboarding Batch 14', category: 'Workshop', owner: 'organizer', venue: 'Training Room B', capacity: 30, day: 5, time: null, hours: 8, signups: 9,
    description: 'Welcome session for the new joiners. No fixed start time.' },
  { title: 'Q4 Leadership Offsite', category: 'Team Offsite', owner: 'admin', venue: 'Lakeside Resort, Pune', capacity: 40, day: 12, time: '09:30', hours: 8, signups: 22, cover: 'offsite',
    description: 'Two days of planning for next quarter, away from the desks.' },
  { title: 'All-Hands Town Hall', category: 'Conference', owner: 'admin', venue: 'Main Auditorium', capacity: 200, kind: 'live', signups: 18, cover: 'townhall',
    description: 'Company update and open questions from the floor.' },
  { title: 'Security Awareness Training', category: 'Workshop', owner: 'organizer', venue: 'Training Room A', capacity: 40, past: -6, time: '10:00', hours: 2, signups: 20, attendance: true,
    description: 'Phishing, password hygiene and incident reporting.' },
  { title: 'Summer Social Mixer', category: 'Social', owner: 'admin', venue: 'Rooftop Lounge', capacity: 60, past: -20, time: '18:30', hours: 3, signups: 14, attendance: true,
    description: 'Food, music and no slides.' },
  { title: 'Team Picnic', category: 'Social', owner: 'admin', venue: 'Cubbon Park', capacity: 80, past: -30, time: '11:00', hours: 5, signups: 11, attendance: true,
    description: 'A Saturday out with families welcome.' },
  { title: 'Product Review', category: 'Conference', owner: 'admin', venue: 'Boardroom 1', capacity: 30, past: -36, time: '15:00', hours: 2, signups: 9, attendance: true,
    description: 'Quarterly review of roadmap and metrics.' },
  { title: 'Q2 Town Hall', category: 'Conference', owner: 'admin', venue: 'Main Auditorium', capacity: 200, past: -42, time: '15:00', hours: 2, signups: 16, attendance: true,
    description: 'Half-year company update.' },
  { title: 'Vendor Expo', category: 'Conference', owner: 'admin', venue: 'Convention Centre', capacity: 150, day: 18, time: '10:00', hours: 6, signups: 4, cancelled: true,
    description: 'Cancelled: the venue withdrew.' },
  { title: 'Year-End Gala', category: 'Social', owner: 'admin', venue: 'Grand Ballroom', capacity: 250, day: 60, time: '19:00', hours: 4, draft: true,
    description: 'Still being planned.' },
  { title: 'Hackathon 2027', category: 'Conference', owner: 'organizer', venue: 'Innovation Lab', capacity: 120, day: 35, time: '09:00', hours: 30, draft: true,
    description: 'Two days, one prototype per team.' },
];

// 1200x525 (the cards crop to about 16:7) gradients with a few soft shapes: enough to read as a
// cover image without shipping binary assets.
const COVERS = {
  launch: ['#FF5A1F', '#7A1F5C'],
  offsite: ['#0F766E', '#134E4A'],
  townhall: ['#1D4ED8', '#0F172A'],
};
function coverSvg([from, to]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 525" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="1200" height="525" fill="url(#g)"/>
<circle cx="980" cy="120" r="220" fill="#fff" fill-opacity=".10"/><circle cx="1090" cy="430" r="150" fill="#fff" fill-opacity=".08"/>
<circle cx="180" cy="470" r="200" fill="#000" fill-opacity=".12"/></svg>`;
}
async function writeCovers() {
  const dir = path.resolve(config.STORAGE_LOCAL_DIR, 'demo');
  await fs.mkdir(dir, { recursive: true });
  const urls = {};
  for (const [name, colors] of Object.entries(COVERS)) {
    await fs.writeFile(path.join(dir, `${name}.svg`), coverSvg(colors));
    urls[name] = `${config.SERVER_BASE_URL}/uploads/demo/${name}.svg`;
  }
  return urls;
}

async function resetDemo() {
  const admin = await User.findOne({ email: ROLE_USERS[0].email });
  const orgs = await Organization.find({ name: ORG_NAME, ...(admin ? { createdBy: admin._id } : {}) });
  for (const org of orgs) {
    const eventIds = (await Event.find({ organization: org._id }).select('_id')).map((e) => e._id);
    await EventRegistration.deleteMany({ organization: org._id });
    await Event.deleteMany({ organization: org._id });
    await Invite.deleteMany({ organization: org._id });
    await OrganizationMember.deleteMany({ organization: org._id });
    await AuditLog.deleteMany({ organization: org._id });
    await Notification.deleteMany({ $or: [{ organization: org._id }, { relatedEntityId: { $in: eventIds } }] });
    await Organization.deleteOne({ _id: org._id });
  }
  await User.deleteMany({ email: /^demo\..+@eventforge\.dev$/ });
  logger.info('Cleared the demo organization and users');
}

async function ensureUser({ name, email: address }) {
  return (await User.findOne({ email: address })) ?? registerUser({ name, email: address, password: PASSWORD });
}

// Moves an event to a start instant that is in the past (or otherwise unreachable through the
// service, which only publishes future events). Every field the model would derive is set
// together, because a native update skips the pre-validate hook.
async function moveEvent(event, startMs, durationMs) {
  const s = wall(startMs);
  const e = wall(startMs + durationMs);
  await Event.collection.updateOne(
    { _id: event._id },
    { $set: {
      startDate: utcMidnight(s.date), endDate: utcMidnight(e.date), startTime: s.time, endTime: e.time,
      startsAt: new Date(startMs), endsAt: new Date(startMs + durationMs),
    } }
  );
}

async function seedDemo() {
  const covers = await writeCovers();

  const people = {};
  for (const spec of ROLE_USERS) people[spec.key] = await ensureUser(spec);
  const attendees = [];
  for (const [i, name] of ATTENDEE_NAMES.entries()) {
    attendees.push(await ensureUser({ name, email: email(`demo.attendee${i + 1}`) }));
  }
  // The employee comes first so they hold a spot in most events and their dashboard is not empty.
  const pool = [people.employee, ...attendees];

  const org = await createOrganization({
    name: ORG_NAME, description: 'A demo organization with events in every state.', createdBy: people.admin._id,
  });
  for (const spec of ROLE_USERS.filter((r) => r.role !== ROLES.SUPER_ADMIN)) {
    await OrganizationMember.create({
      organization: org._id, user: people[spec.key]._id, role: spec.role, status: MEMBER_STATUS.ACTIVE,
    });
  }
  for (const user of attendees) {
    await OrganizationMember.create({
      organization: org._id, user: user._id, role: ROLES.EMPLOYEE, status: MEMBER_STATUS.ACTIVE,
    });
  }

  const auditRows = [];
  const audit = (actor, action, entityType, entityId, event, at, extra) =>
    auditRows.push({
      organization: org._id, actor: actor._id, action, entityType, entityId,
      metadata: eventAuditMetadata(event, extra), createdAt: new Date(at),
    });

  for (const [specIndex, spec] of SPECS.entries()) {
    const owner = people[spec.owner];
    const durationMs = (spec.hours ?? 2) * H;

    // Where the event really sits on the timeline...
    let realStartMs;
    if (spec.kind === 'starting') realStartMs = Math.ceil((NOW + 3 * H + 15 * 60_000) / 300_000) * 300_000;
    else if (spec.kind === 'live') realStartMs = NOW - 40 * 60_000;
    else if (spec.past !== undefined) realStartMs = atWall(spec.past, spec.time);
    else realStartMs = atWall(spec.day, spec.time ?? '00:00'); // no time = start of the day, the model's own rule
    // ...and where it is created: in the future, so the service will publish it and take
    // registrations. The live and past ones are moved to realStartMs afterwards.
    const startMs = spec.kind === 'live' || spec.past !== undefined ? NOW + 2 * D : realStartMs;

    const start = wall(startMs);
    const end = wall(startMs + durationMs);
    const noTime = spec.time === null;
    const event = await createEvent({
      organization: org._id,
      createdBy: owner._id,
      data: {
        title: spec.title, description: spec.description, category: spec.category, timezone: TZ,
        startDate: utcMidnight(start.date), endDate: utcMidnight(end.date),
        startTime: noTime ? '' : start.time, endTime: noTime ? '' : end.time,
        venue: { name: spec.venue }, capacity: spec.capacity,
        ...(spec.cover ? { coverImage: covers[spec.cover] } : {}),
      },
    });

    // Created well before anything is registered, and always before the event itself.
    const createdAt = Math.min(realStartMs - 4 * D, NOW - 45 * D);
    audit(owner, AUDIT_ACTIONS.EVENT_CREATED, 'Event', event._id, event, createdAt);
    if (spec.draft) {
      await Event.collection.updateOne({ _id: event._id }, { $set: { createdAt: new Date(NOW - (2 + (specIndex % 3)) * D) } });
      continue;
    }

    await publishEvent(event);
    const publishedAt = createdAt + 2 * H;
    audit(owner, AUDIT_ACTIONS.EVENT_PUBLISHED, 'Event', event._id, event, publishedAt);
    await Event.collection.updateOne(
      { _id: event._id },
      { $set: { createdAt: new Date(createdAt), publishedAt: new Date(publishedAt) } }
    );

    // Register in pool order; capacity overflow lands WAITLISTED on its own.
    const registrations = [];
    for (const user of pool.slice(0, spec.signups ?? 0)) {
      registrations.push({ user, registration: await registerForEvent(event, user) });
    }

    // Spread sign-ups over the last ~6 weeks, always before the event itself, so this month and last
    // month both have real counts. The first few on a soon-to-start event are minutes old.
    const latestAllowed = Math.min(NOW - 5 * 60_000, realStartMs - H);
    const fresh = spec.kind === 'starting' ? [7 * 60_000, 25 * 60_000, 95 * 60_000] : [];
    for (const [i, { user, registration }] of registrations.entries()) {
      const backDays = 1 + ((i * 7 + specIndex * 3) % 40);
      let registeredAt = fresh[i] !== undefined ? NOW - fresh[i] : Math.min(NOW - backDays * D, latestAllowed);
      registeredAt = Math.max(registeredAt, publishedAt + H);
      await EventRegistration.collection.updateOne({ _id: registration._id }, { $set: { registeredAt: new Date(registeredAt) } });
      const waitlisted = registration.status === REGISTRATION_STATUS.WAITLISTED;
      audit(user, waitlisted ? AUDIT_ACTIONS.REGISTRATION_WAITLISTED : AUDIT_ACTIONS.REGISTRATION_CREATED,
        'EventRegistration', registration._id, event, registeredAt);
    }

    if (spec.kind === 'live') {
      await moveEvent(event, realStartMs, durationMs);
    } else if (spec.past !== undefined) {
      await moveEvent(event, realStartMs, durationMs);
      if (spec.attendance) {
        const confirmed = registrations.filter((r) => r.registration.status === REGISTRATION_STATUS.REGISTERED);
        for (const [i, { registration }] of confirmed.entries()) {
          const status = i % 6 === 5 ? ATTENDANCE_STATUS.NO_SHOW : ATTENDANCE_STATUS.ATTENDED;
          await markAttendance(event._id, registration._id, status);
        }
        audit(owner, AUDIT_ACTIONS.ATTENDANCE_MARKED, 'EventRegistration', null, event, realStartMs + durationMs + H);
      }
    }

    if (spec.registrationClosed) {
      await Event.collection.updateOne(
        { _id: event._id },
        { $set: { registrationDeadline: utcMidnight(wall(NOW - D).date), registrationClosesAt: new Date(NOW - 2 * H) } }
      );
    }

    if (spec.cancelled) {
      await cancelEvent(event);
      audit(owner, AUDIT_ACTIONS.EVENT_CANCELLED, 'Event', event._id, event, NOW - 3 * H);
    }

    // Bell content for things still ahead of us: the announcement, and the demo employee's own
    // confirmation or waitlist notice.
    if (!spec.cancelled && spec.past === undefined && spec.kind !== 'live') {
      await notifyEventPublished(event, owner._id);
      const mine = registrations.find((r) => String(r.user._id) === String(people.employee._id));
      if (mine) {
        if (mine.registration.status === REGISTRATION_STATUS.WAITLISTED) await notifyRegistrationWaitlisted(mine.registration, event);
        else await notifyRegistrationConfirmed(mine.registration, event);
      }
    }
  }

  // Two pending invites. Written directly, not through createOrResendInvite, which would email
  // these made-up addresses for real if a Resend key is configured.
  for (const [i, address] of ['priya.sharma@example.com', 'tom.becker@example.com'].entries()) {
    await Invite.create({
      organization: org._id, email: address, role: i === 0 ? ROLES.ORGANIZER : ROLES.EMPLOYEE,
      invitedBy: people.admin._id, tokenHash: createHash('sha256').update(randomBytes(32)).digest('hex'),
      status: INVITE_STATUS.PENDING, expiresAt: new Date(NOW + 5 * D),
    });
    auditRows.push({
      organization: org._id, actor: people.admin._id, action: AUDIT_ACTIONS.INVITE_SENT, entityType: 'Invite',
      entityId: null, metadata: { email: address }, createdAt: new Date(NOW - (i + 1) * 5 * H),
    });
  }

  // Direct insert rather than writeAuditLog, which cannot take a timestamp: the feed should read as
  // history, not as everything having just happened.
  await AuditLog.insertMany(auditRows, { timestamps: false });

  return { org, count: { events: SPECS.length, audit: auditRows.length } };
}

async function main() {
  if (config.NODE_ENV === 'production') {
    logger.error('Refusing to seed demo data into a production database');
    process.exit(1);
  }
  await connectDB();

  if (RESET) await resetDemo();

  const existing = await Organization.findOne({ name: ORG_NAME });
  if (existing) {
    console.log(`\nThe demo organization already exists. Run with --reset to recreate it.\n`);
  } else {
    const { org, count } = await seedDemo();
    logger.info({ org: org.slug, ...count }, 'Demo data created');
  }

  console.log(`\nDemo organization: ${ORG_NAME}   (password for all: ${PASSWORD})`);
  for (const spec of ROLE_USERS) console.log(`  ${spec.role.padEnd(12)} ${spec.email}`);
  console.log('');

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Demo seed failed');
  process.exit(1);
});
