import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { useDeleteEvent } from '../hooks/useEventMutations.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

export function DeleteEventDialog({ orgId, event, open, onClose }) {
  const navigate = useNavigate();
  const { organizationSlug } = useActiveOrganization();
  const deleteEvent = useDeleteEvent(orgId, event._id);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Delete ${event.title}?`}
      description="This permanently deletes the event and every registration for it. This cannot be undone."
      confirmLabel="Delete event"
      isPending={deleteEvent.isPending}
      error={deleteEvent.error}
      onConfirm={() =>
        deleteEvent.mutate(undefined, {
          onSuccess: () => navigate(ROUTES.orgEvents(organizationSlug), { replace: true }),
        })
      }
    />
  );
}
