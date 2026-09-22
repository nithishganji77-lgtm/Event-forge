import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ROUTES } from '../utils/constants.js';

// Keeps '/dashboard' working as a stable post-login target without the caller needing to know
// which org to land in — resolves to the first membership's org dashboard, or onboarding if none.
export function DashboardRedirect() {
  const { memberships, isLoading } = useAuth();

  if (isLoading) return <Spinner />;

  if (memberships.length === 0) {
    return <Navigate to={ROUTES.ONBOARDING} replace />;
  }

  return <Navigate to={ROUTES.orgDashboard(memberships[0].organizationSlug)} replace />;
}
