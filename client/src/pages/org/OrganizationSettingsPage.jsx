import { useState } from 'react';
import { useActiveOrganization } from '../../hooks/useActiveOrganization.js';
import { useOrganization } from '../../features/organizations/hooks/useOrganization.js';
import { OrganizationSettingsForm } from '../../features/organizations/components/OrganizationSettingsForm.jsx';
import { DeleteOrganizationDialog } from '../../features/organizations/components/DeleteOrganizationDialog.jsx';
import { RequirePermission } from '../../components/RequirePermission.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { PERMISSIONS } from '../../utils/permissions.js';

export function OrganizationSettingsPage() {
  const { organizationId } = useActiveOrganization();
  const { data, isLoading } = useOrganization(organizationId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div className="max-w-xl space-y-12">
      <div>
        <h1 className="text-2xl font-semibold mb-6">Organization settings</h1>
        <OrganizationSettingsForm organization={data.organization} />
      </div>

      <RequirePermission permission={PERMISSIONS.ORGANIZATION_DELETE}>
        <div className="border border-(--color-accent)/40 p-6">
          <h2 className="text-lg font-semibold mb-1">Danger zone</h2>
          <p className="text-sm text-(--color-text)/60 mb-4">
            Permanently delete this organization and every member's access to it.
          </p>
          <Button variant="outline" onClick={() => setDeleteOpen(true)}>
            Delete organization
          </Button>
        </div>
        <DeleteOrganizationDialog
          organization={data.organization}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
        />
      </RequirePermission>
    </div>
  );
}
