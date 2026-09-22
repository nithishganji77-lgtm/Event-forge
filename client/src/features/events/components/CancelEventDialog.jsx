import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { useCancelEvent } from '../hooks/useEventMutations.js';

export function CancelEventDialog({ orgId, event, open, onClose }) {
  const cancelEvent = useCancelEvent(orgId, event._id);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Cancel ${event.title}?`}
      description="Registrations already made stay on record, but no one will be able to register or join the waitlist afterward."
      confirmLabel="Cancel event"
      isPending={cancelEvent.isPending}
      error={cancelEvent.error}
      onConfirm={() => cancelEvent.mutate(undefined, { onSuccess: onClose })}
    />
  );
}
