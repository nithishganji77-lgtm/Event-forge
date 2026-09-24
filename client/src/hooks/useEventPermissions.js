import { useAuth } from './useAuth.js';
import { useActiveOrganization } from './useActiveOrganization.js';
import { PERMISSIONS, ROLES } from '../utils/permissions.js';

// What the current user may do to one event. UX gating only — the server enforces the same rules
// (permission + ownership: SUPER_ADMIN/ORG_ADMIN bypass ownership by role, anyone else must have
// created the event or be listed as an organizer, and an additive permission grant never
// substitutes for ownership). Shared by the event detail page and each event card's menu so the
// two can never disagree about what's allowed.
// Safe to call before the event has loaded (returns all-false), so a page can call it above its
// loading early-returns without breaking hook order.
export function useEventPermissions(event) {
  const { user } = useAuth();
  const { role, permissions } = useActiveOrganization();

  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN;
  const isOwner = Boolean(user?.id) && (event?.createdBy === user.id || Boolean(event?.organizers?.includes(user.id)));
  const elevated = isAdmin || isOwner;
  const canManage = elevated && permissions.has(PERMISSIONS.EVENT_UPDATE);

  return {
    isAdmin,
    isOwner,
    canManage,
    canPublish: elevated && permissions.has(PERMISSIONS.EVENT_PUBLISH) && event?.status === 'DRAFT',
    canDelete: elevated && permissions.has(PERMISSIONS.EVENT_DELETE),
    canViewAttendees: elevated && permissions.has(PERMISSIONS.REGISTRATION_MANAGE),
    canViewAnalytics: elevated && permissions.has(PERMISSIONS.ANALYTICS_READ),
    canDuplicate: canManage,
    canCancel: canManage && Boolean(event) && event.status !== 'CANCELLED',
  };
}
