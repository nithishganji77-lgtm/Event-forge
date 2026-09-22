import slugify from 'slugify';
import { Organization } from '../models/Organization.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { Invite } from '../models/Invite.js';
import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { ROLES, MEMBER_STATUS } from '../constants/roles.js';

export async function generateUniqueSlug(name) {
  const base = slugify(name, { lower: true, strict: true }) || 'org';
  let candidate = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Organization.exists({ slug: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function createOrganization({ name, description, createdBy }) {
  const slug = await generateUniqueSlug(name);
  const organization = await Organization.create({ name, slug, description, createdBy });

  try {
    await OrganizationMember.create({
      organization: organization._id,
      user: createdBy,
      role: ROLES.SUPER_ADMIN,
      status: MEMBER_STATUS.ACTIVE,
    });
  } catch (err) {
    // Best-effort rollback — no multi-doc transactions on a standalone Mongo instance.
    await Organization.deleteOne({ _id: organization._id });
    throw err;
  }

  return organization;
}

export async function listOrganizationsForUser(userId) {
  const memberships = await OrganizationMember.find({ user: userId, status: MEMBER_STATUS.ACTIVE })
    .populate('organization')
    .lean();

  return memberships
    .filter((m) => m.organization)
    .map((m) => ({ ...m.organization, role: m.role }));
}

export async function updateOrganization(organization, updates) {
  Object.assign(organization, updates);
  await organization.save();
  return organization;
}

export async function deleteOrganization(organization) {
  await OrganizationMember.deleteMany({ organization: organization._id });
  await Invite.deleteMany({ organization: organization._id });
  await EventRegistration.deleteMany({ organization: organization._id });
  await Event.deleteMany({ organization: organization._id });
  await organization.deleteOne();
}
