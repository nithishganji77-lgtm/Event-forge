import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, Copy, Ellipsis, Link2, Pencil, Trash2, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu.jsx';
import { CancelEventDialog } from './CancelEventDialog.jsx';
import { DeleteEventDialog } from './DeleteEventDialog.jsx';
import { DuplicateEventDialog } from './DuplicateEventDialog.jsx';
import { useEventPermissions } from '../../../hooks/useEventPermissions.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';
import { cn } from '../../../lib/cn.js';

// The "⋯" menu on an event card. What appears is gated by the same rules as the event page
// (useEventPermissions), so an organizer never sees actions the server would reject. The dialogs
// are rendered here, outside the menu panel, so they outlive the panel closing.
//
// Not offered: "Export attendees" (there is no CSV export in the product yet).
// `omit` drops items by key (edit, attendees, duplicate, link, cancel, delete) for a caller that
// shows them elsewhere; `bordered` gives the trigger a visible button shape.
export function EventCardMenu({ event, omit = [], bordered = false }) {
  const { organizationSlug } = useActiveOrganization();
  const perms = useEventPermissions(event);
  const [dialog, setDialog] = useState(null);
  const detailPath = ROUTES.orgEventDetail(organizationSlug, event._id);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${detailPath}`);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link');
    }
  }

  return (
    <>
      <DropdownMenu
        label={`Actions for ${event.title}`}
        trigger={({ triggerProps }) => (
          <button
            {...triggerProps}
            aria-label={`More actions for ${event.title}`}
            className={cn(
              'grid place-items-center rounded-(--ef-radius-sm) text-(--color-text)/60 transition-colors hover:bg-(--color-bg-secondary) hover:text-(--color-text) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
              bordered ? 'size-10 border border-(--color-border) bg-(--color-surface)' : 'size-8'
            )}
          >
            <Ellipsis className="size-4" aria-hidden="true" />
          </button>
        )}
      >
        {perms.canManage && !omit.includes('edit') && (
          <DropdownMenuItem as={Link} to={ROUTES.orgEventEdit(organizationSlug, event._id)} icon={Pencil}>
            Edit event
          </DropdownMenuItem>
        )}
        {perms.canViewAttendees && !omit.includes('attendees') && (
          <DropdownMenuItem as={Link} to={`${detailPath}?tab=attendees`} icon={Users}>
            Manage attendees
          </DropdownMenuItem>
        )}
        {perms.canDuplicate && !omit.includes('duplicate') && (
          <DropdownMenuItem icon={Copy} onSelect={() => setDialog('duplicate')}>
            Duplicate
          </DropdownMenuItem>
        )}
        {!omit.includes('link') && (
          <DropdownMenuItem icon={Link2} onSelect={copyLink}>
            Copy link
          </DropdownMenuItem>
        )}
        {(perms.canCancel || perms.canDelete) && <DropdownMenuSeparator />}
        {perms.canCancel && (
          <DropdownMenuItem icon={Ban} destructive onSelect={() => setDialog('cancel')}>
            Cancel event
          </DropdownMenuItem>
        )}
        {perms.canDelete && (
          <DropdownMenuItem icon={Trash2} destructive onSelect={() => setDialog('delete')}>
            Delete event
          </DropdownMenuItem>
        )}
      </DropdownMenu>

      {dialog === 'duplicate' && (
        <DuplicateEventDialog orgId={event.organization} event={event} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'cancel' && (
        <CancelEventDialog orgId={event.organization} event={event} open onClose={() => setDialog(null)} />
      )}
      {dialog === 'delete' && (
        <DeleteEventDialog orgId={event.organization} event={event} open onClose={() => setDialog(null)} />
      )}
    </>
  );
}
