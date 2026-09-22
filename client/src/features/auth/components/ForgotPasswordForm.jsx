import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { forgotPasswordSchema } from '../schemas/auth.schema.js';
import { forgotPasswordRequest } from '../../../services/auth.service.js';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';
import { ROUTES } from '../../../utils/constants.js';

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const mutation = useMutation({
    mutationFn: forgotPasswordRequest,
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <Alert tone="success">
        If an account exists for that email, a reset link has been sent. Check your inbox.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5" noValidate>
      {mutation.isError && (
        <Alert tone="error">{extractErrorMessage(mutation.error, 'Could not send reset link')}</Alert>
      )}

      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        register={register('email')}
        error={errors.email?.message}
      />

      <Button type="submit" variant="accent" loading={mutation.isPending} className="w-full">
        SEND RESET LINK →
      </Button>

      <p className="text-sm text-(--color-text)/70">
        <Link to={ROUTES.LOGIN} className="hover:text-(--color-accent)">
          ← Back to login
        </Link>
      </p>
    </form>
  );
}
