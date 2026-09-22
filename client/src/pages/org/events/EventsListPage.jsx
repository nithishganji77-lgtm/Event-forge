import { Link } from 'react-router-dom';
import { EventsList } from '../../../features/events/components/EventsList.jsx';
import { RequirePermission } from '../../../components/RequirePermission.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
import { ROUTES } from '../../../utils/constants.js';

export function EventsListPage() {
  const { organizationId, organizationSlug } = useActiveOrganization();

  const createButton = (
    <RequirePermission permission={PERMISSIONS.EVENT_CREATE}>
      <Button as={Link} to={ROUTES.orgEventNew(organizationSlug)} variant="accent">
        + CREATE EVENT
      </Button>
    </RequirePermission>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Events</h1>
        {createButton}
      </div>
      <EventsList organizationId={organizationId} emptyAction={createButton} />
    </div>
  );
}
