import { Link } from 'react-router-dom';
import { Plus, Users, CalendarRange } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

export function QuickActionsBar() {
  const { organizationSlug } = useActiveOrganization();

  return (
    <div className="flex flex-wrap gap-3 mb-10">
      <Button as={Link} to={ROUTES.orgEventNew(organizationSlug)} variant="accent">
        <Plus className="size-4" aria-hidden="true" />
        CREATE EVENT
      </Button>
      <Button as={Link} to={ROUTES.orgEvents(organizationSlug)} variant="outline">
        <Users className="size-4" aria-hidden="true" />
        MANAGE ATTENDEES
      </Button>
      <Button as={Link} to={ROUTES.orgCalendar(organizationSlug)} variant="outline">
        <CalendarRange className="size-4" aria-hidden="true" />
        VIEW CALENDAR
      </Button>
    </div>
  );
}
