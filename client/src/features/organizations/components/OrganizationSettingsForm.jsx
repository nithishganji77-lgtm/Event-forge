import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateOrganizationSchema } from '../schemas/organization.schema.js';
import { useUpdateOrganization } from '../hooks/useUpdateOrganization.js';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';

export function OrganizationSettingsForm({ organization }) {
  const updateOrganization = useUpdateOrganization(organization._id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: organization.name, description: organization.description || '' },
  });

  return (
    <form onSubmit={handleSubmit((values) => updateOrganization.mutate(values))} className="space-y-5" noValidate>
      {updateOrganization.isError && (
        <Alert tone="error">{extractErrorMessage(updateOrganization.error, 'Could not save changes')}</Alert>
      )}
      {updateOrganization.isSuccess && <Alert tone="success">Saved.</Alert>}

      <FormField label="Organization name" register={register('name')} error={errors.name?.message} />
      <FormField label="Description" register={register('description')} error={errors.description?.message} />

      <Button type="submit" variant="primary" loading={updateOrganization.isPending}>
        Save changes
      </Button>
    </form>
  );
}
