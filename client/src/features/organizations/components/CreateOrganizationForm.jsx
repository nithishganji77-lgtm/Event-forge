import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { createOrganizationSchema } from '../schemas/organization.schema.js';
import { useCreateOrganization } from '../hooks/useCreateOrganization.js';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';
import { ROUTES } from '../../../utils/constants.js';

export function CreateOrganizationForm({ onCreated }) {
  const navigate = useNavigate();
  const createOrganization = useCreateOrganization();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(createOrganizationSchema) });

  const onSubmit = (values) => {
    createOrganization.mutate(values, {
      onSuccess: ({ organization }) => {
        if (onCreated) onCreated(organization);
        else navigate(ROUTES.orgDashboard(organization.slug), { replace: true });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {createOrganization.isError && (
        <Alert tone="error">{extractErrorMessage(createOrganization.error, 'Could not create organization')}</Alert>
      )}

      <FormField
        label="Organization name"
        autoComplete="organization"
        register={register('name')}
        error={errors.name?.message}
      />
      <FormField
        label="Description (optional)"
        register={register('description')}
        error={errors.description?.message}
      />

      <Button type="submit" variant="accent" loading={createOrganization.isPending} className="w-full">
        CREATE ORGANIZATION →
      </Button>
    </form>
  );
}
