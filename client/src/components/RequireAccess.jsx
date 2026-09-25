import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { EmptyState } from './ui/EmptyState.jsx';
import { Button } from './ui/Button.jsx';
import { useActiveOrganization } from '../hooks/useActiveOrganization.js';
import { ROUTES } from '../utils/constants.js';

// Route-level version of RequirePermission: a person who reaches a page by typing its URL, and
// whose role cannot use it, sees why instead of a form that fails on submit or a spinner that never
// ends. Still UX only: the sidebar already hides these pages, and the server enforces every action.
export function RequireAccess({ permission, children }) {
  const { permissions, organizationSlug } = useActiveOrganization();
  if (permissions.has(permission)) return children;

  return (
    <EmptyState
      icon={Lock}
      titleAs="h1"
      title="You don't have access to this page"
      description="Your role in this organization doesn't include it. Ask an admin if you need it."
      action={
        <Button as={Link} to={ROUTES.orgDashboard(organizationSlug)} variant="outline">
          Back to dashboard
        </Button>
      }
    />
  );
}
