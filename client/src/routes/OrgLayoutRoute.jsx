import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useActiveOrganization } from '../hooks/useActiveOrganization.js';
import { DashboardLayout } from '../layouts/DashboardLayout.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ROUTES } from '../utils/constants.js';

// Resolves :orgSlug against the caller's cached memberships. A slug that doesn't match anything
// (typo, stale bookmark, or an org the user was removed from) redirects to a valid org instead of
// dead-ending, rather than rendering a confusing empty shell.
export function OrgLayoutRoute() {
  const { memberships, isLoading } = useAuth();
  const { membership } = useActiveOrganization();

  if (isLoading) return <Spinner />;

  if (!membership) {
    if (memberships.length === 0) return <Navigate to={ROUTES.ONBOARDING} replace />;
    return <Navigate to={ROUTES.orgDashboard(memberships[0].organizationSlug)} replace />;
  }

  return <DashboardLayout />;
}
