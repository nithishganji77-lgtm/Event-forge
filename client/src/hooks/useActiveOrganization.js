import { useParams } from 'react-router-dom';
import { useAuth } from './useAuth.js';
import { getEffectivePermissions } from '../utils/permissions.js';

export function useActiveOrganization() {
  const { orgSlug } = useParams();
  const { memberships, isLoading } = useAuth();
  const membership = memberships.find((m) => m.organizationSlug === orgSlug);

  return {
    membership,
    isLoading,
    organizationId: membership?.organizationId ?? null,
    organizationSlug: membership?.organizationSlug ?? null,
    organizationName: membership?.organizationName ?? null,
    role: membership?.role ?? null,
    permissions: membership
      ? getEffectivePermissions(membership.role, membership.permissions)
      : new Set(),
  };
}
