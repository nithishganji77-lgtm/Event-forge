import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPasswordSchema } from '../schemas/auth.schema.js';
import { resetPasswordRequest } from '../../../services/auth.service.js';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';
import { ROUTES } from '../../../utils/constants.js';

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  const mutation = useMutation({
    mutationFn: (values) => resetPasswordRequest({ ...values, token }),
    onSuccess: () => navigate(ROUTES.LOGIN, { replace: true }),
  });

  if (!token) {
    return (
      <Alert tone="error">
        This reset link is missing its token.{' '}
        <Link to={ROUTES.FORGOT_PASSWORD} className="underline">
          Request a new one
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5" noValidate>
      {mutation.isError && (
        <Alert tone="error">{extractErrorMessage(mutation.error, 'Could not reset password')}</Alert>
      )}

      <FormField
        label="New password"
        type="password"
        autoComplete="new-password"
        register={register('password')}
        error={errors.password?.message}
      />

      <Button type="submit" variant="accent" loading={mutation.isPending} className="w-full">
        RESET PASSWORD →
      </Button>
    </form>
  );
}
