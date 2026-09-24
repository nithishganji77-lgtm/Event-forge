import { describe, it, expect } from 'vitest';
import { renderAtOrgRoute } from '../../tests/test-utils.jsx';
import { useEventPermissions } from './useEventPermissions.js';

const membership = (role, permissions = []) => ({
  organizationId: 'org-1',
  organizationSlug: 'acme',
  organizationName: 'Acme',
  role,
  permissions,
});

function permsFor(role, event, { userId = 'user-1', extra = [] } = {}) {
  let result;
  function Probe() {
    result = useEventPermissions(event);
    return null;
  }
  renderAtOrgRoute(<Probe />, {
    orgSlug: 'acme',
    memberships: [membership(role, extra)],
    user: { id: userId, name: 'U', email: 'u@example.com' },
  });
  return result;
}

const event = { createdBy: 'someone-else', organizers: [], status: 'PUBLISHED' };

describe('useEventPermissions', () => {
  it('lets an admin manage any event (ownership bypass is role-based)', () => {
    const perms = permsFor('ORG_ADMIN', event);
    expect(perms).toMatchObject({ isAdmin: true, canManage: true, canDelete: true, canViewAttendees: true, canCancel: true });
  });

  it('scopes an organizer to events they created or organize', () => {
    expect(permsFor('ORGANIZER', event).canManage).toBe(false);
    expect(permsFor('ORGANIZER', { ...event, createdBy: 'user-1' }).canManage).toBe(true);
    expect(permsFor('ORGANIZER', { ...event, organizers: ['user-1'] }).canViewAttendees).toBe(true);
  });

  it("never grants an organizer delete — the role doesn't hold EVENT_DELETE", () => {
    expect(permsFor('ORGANIZER', { ...event, createdBy: 'user-1' }).canDelete).toBe(false);
  });

  it('does not treat an additive permission grant as ownership', () => {
    const perms = permsFor('EMPLOYEE', event, { extra: ['EVENT_UPDATE'] });
    expect(perms.canManage).toBe(false);
  });

  it('gives an employee nothing', () => {
    const perms = permsFor('EMPLOYEE', event);
    expect(Object.values(perms).every((value) => value === false)).toBe(true);
  });

  it('offers publish only for drafts and cancel only for events that are not already cancelled', () => {
    expect(permsFor('SUPER_ADMIN', { ...event, status: 'DRAFT' }).canPublish).toBe(true);
    expect(permsFor('SUPER_ADMIN', event).canPublish).toBe(false);
    expect(permsFor('SUPER_ADMIN', { ...event, status: 'CANCELLED' }).canCancel).toBe(false);
  });

  it('is safe to call before the event has loaded', () => {
    const perms = permsFor('SUPER_ADMIN', undefined);
    expect(perms.canCancel).toBe(false);
    expect(perms.canPublish).toBe(false);
  });
});
