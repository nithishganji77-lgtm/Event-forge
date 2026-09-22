import { useActiveOrganization } from '../hooks/useActiveOrganization.js';

// UX-only gating — hides/shows controls the user likely can't use. The backend enforces the real
// permission check on every request regardless of what this renders.
export function RequirePermission({ permission, fallback = null, children }) {
  const { permissions } = useActiveOrganization();
  return permissions.has(permission) ? children : fallback;
}
