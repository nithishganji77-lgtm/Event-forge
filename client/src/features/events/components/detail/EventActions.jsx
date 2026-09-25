import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button } from '../../../../components/ui/Button.jsx';
import { EventCardMenu } from '../EventCardMenu.jsx';
import { RegisterButton } from '../RegisterButton.jsx';
import { useActiveOrganization } from '../../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../../utils/constants.js';

// Different people get different actions. Someone who runs the event sees management first (Publish
// for a draft, Edit, Manage attendees) with everything destructive folded into the "⋯" menu, so
// Cancel and Delete never sit next to Edit. Someone who attends sees their registration state.
// Both can copy the link from the menu.
export function EventActions({ event, perms, onPublish, publishing }) {
  const { organizationSlug } = useActiveOrganization();
  const isDraft = event.status === 'DRAFT';
  const manages = perms.canManage || perms.canPublish || perms.canViewAttendees;

  // A manager only needs the register control when it is actionable: they are registered, or
  // registration is open. Otherwise it would be a disabled "registration closed" button on every
  // finished event they organise.
  const showRegister = !isDraft && (!manages || event.displayStatus === 'REGISTRATION_OPEN' || Boolean(event.myRegistrationStatus));

  return (
    <div className="flex flex-wrap items-center gap-3">
      {perms.canPublish && (
        <Button variant="accent" loading={publishing} onClick={onPublish}>
          Publish
        </Button>
      )}
      {perms.canManage && (
        <Button as={Link} to={ROUTES.orgEventEdit(organizationSlug, event._id)}>
          Edit event
        </Button>
      )}
      {perms.canViewAttendees && (
        <Button as={Link} to={{ search: '?tab=attendees' }} replace variant="outline">
          <Users className="size-4" aria-hidden="true" />
          Manage attendees
        </Button>
      )}
      {showRegister && <RegisterButton event={event} detailed />}
      <div className="ml-auto">
        <EventCardMenu event={event} omit={['edit', 'attendees']} bordered />
      </div>
    </div>
  );
}
