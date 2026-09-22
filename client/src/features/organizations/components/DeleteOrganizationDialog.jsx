import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { useDeleteOrganization } from '../hooks/useDeleteOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

export function DeleteOrganizationDialog({ organization, open, onClose }) {
  const navigate = useNavigate();
  const deleteOrganization = useDeleteOrganization(organization._id);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Delete ${organization.name}?`}
      description="This permanently deletes the organization and every member's access to it. This cannot be undone."
      confirmLabel="Delete organization"
      isPending={deleteOrganization.isPending}
      error={deleteOrganization.error}
      onConfirm={() =>
        deleteOrganization.mutate(undefined, {
          onSuccess: () => navigate(ROUTES.DASHBOARD, { replace: true }),
        })
      }
    />
  );
}
