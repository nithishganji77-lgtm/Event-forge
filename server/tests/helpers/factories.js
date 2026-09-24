// Builds test fixtures through the real service layer wherever meaningful logic exists (password
// hashing, slug generation, the SUPER_ADMIN-on-create membership) — same principle as
// seed/seed.js: exercise real validation/hashing/slugging, not raw Model.create shortcuts that
// would let a test pass against fixture data no real request could ever produce.
import { registerUser } from '../../src/services/auth.service.js';
import { createOrganization } from '../../src/services/organization.service.js';
import { createEvent, publishEvent } from '../../src/services/event.service.js';
import { OrganizationMember } from '../../src/models/OrganizationMember.js';
import { ROLES, MEMBER_STATUS } from '../../src/constants/roles.js';

let userCounter = 0;
let orgCounter = 0;
let eventCounter = 0;

export async function makeUser(overrides = {}) {
  userCounter += 1;
  return registerUser({
    name: overrides.name ?? `Test User ${userCounter}`,
    email: overrides.email ?? `test-user-${userCounter}@example.com`,
    password: overrides.password ?? 'Test@1234',
  });
}

export async function makeOrg({ createdBy, name } = {}) {
  orgCounter += 1;
  const owner = createdBy ?? (await makeUser());
  const organization = await createOrganization({
    name: name ?? `Test Org ${orgCounter}`,
    description: '',
    createdBy: owner._id,
  });
  return { organization, owner };
}

// Adds an already-existing user to an already-existing org at a given role — direct model
// creation is appropriate here (unlike users/orgs, there's no meaningful service-layer logic to
// exercise for this in isolation; real membership creation normally happens via the invite-accept
// flow, which is its own thing, not what these fixtures are testing).
export async function makeMember({ organization, user, role = ROLES.EMPLOYEE, status = MEMBER_STATUS.ACTIVE, permissions = [] }) {
  return OrganizationMember.create({ organization: organization._id, user: user._id, role, status, permissions });
}

export async function makeEvent({ organization, createdBy, overrides = {} } = {}) {
  eventCounter += 1;
  const now = Date.now();
  const startDate = overrides.startDate ?? new Date(now + 7 * 24 * 60 * 60 * 1000);
  const endDate = overrides.endDate ?? new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const event = await createEvent({
    organization: organization._id,
    createdBy: createdBy._id,
    data: {
      title: overrides.title ?? `Test Event ${eventCounter}`,
      category: overrides.category ?? 'General',
      startDate,
      endDate,
      startTime: overrides.startTime,
      endTime: overrides.endTime,
      timezone: overrides.timezone,
      capacity: overrides.capacity ?? 10,
      venue: overrides.venue,
      registrationDeadline: overrides.registrationDeadline,
      organizers: overrides.organizers ?? [],
    },
  });
  return event;
}

export async function makePublishedEvent(args) {
  const event = await makeEvent(args);
  return publishEvent(event);
}
