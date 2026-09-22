import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { useRemoveMember } from '../hooks/useUpdateMember.js';

export function RemoveMemberDialog({ orgId, member, open, onClose }) {
  const removeMember = useRemoveMember(orgId);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Remove ${member.user?.name}?`}
      description="They'll lose access to this organization immediately. They can be invited again later."
      confirmLabel="Remove member"
      isPending={removeMember.isPending}
      error={removeMember.error}
      onConfirm={() => removeMember.mutate(member._id, { onSuccess: onClose })}
    />
  );
}
