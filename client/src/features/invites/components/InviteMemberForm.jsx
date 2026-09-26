import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInviteSchema } from '../schemas/invite.schema.js';
import { useCreateInvite } from '../hooks/useInvites.js';
import { ROLE_LABELS } from '../../members/components/MemberRoleBadge.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { useServerFormErrors } from '../../../hooks/useServerFormErrors.js';

const FIELDS = ['email', 'role'];

export function InviteMemberForm({ orgId, onSent }) {
  const createInvite = useCreateInvite(orgId);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(createInviteSchema), defaultValues: { role: 'EMPLOYEE' } });

  const { alertMessage, onError, clear } = useServerFormErrors(setError, FIELDS);

  const onSubmit = (values) => {
    clear();
    createInvite.mutate(values, {
      onError,
      onSuccess: () => {
        reset();
        if (onSent) onSent();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3" noValidate>
      {alertMessage && (
        <Alert tone="error" className="w-full">
          {alertMessage}
        </Alert>
      )}
      <div className="flex-1 min-w-[14rem]">
        <FormField label="Email" type="email" register={register('email')} error={errors.email?.message} />
      </div>
      <div className="min-w-[10rem]">
        <FormField as={Select} label="Role" register={register('role')} error={errors.role?.message}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </FormField>
      </div>
      <Button type="submit" variant="accent" loading={createInvite.isPending}>
        Send invite
      </Button>
    </form>
  );
}
