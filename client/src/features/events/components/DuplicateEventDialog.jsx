import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { useDuplicateEvent } from '../hooks/useEventMutations.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

export function DuplicateEventDialog({ orgId, event, open, onClose }) {
  const navigate = useNavigate();
  const { organizationSlug } = useActiveOrganization();
  const duplicateEvent = useDuplicateEvent(orgId, event._id);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Duplicate ${event.title}?`}
      description="Creates a new draft with the same details. You'll be taken to the editor to update the dates before publishing."
      confirmLabel="Duplicate event"
      isPending={duplicateEvent.isPending}
      error={duplicateEvent.error}
      onConfirm={() =>
        duplicateEvent.mutate(undefined, {
          onSuccess: (duplicate) =>
            navigate(ROUTES.orgEventEdit(organizationSlug, duplicate._id), { replace: true }),
        })
      }
    />
  );
}
