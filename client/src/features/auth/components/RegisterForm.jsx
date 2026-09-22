import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { registerSchema } from '../schemas/auth.schema.js';
import { useRegister } from '../hooks/useRegister.js';
import { GoogleAuthButton } from './GoogleAuthButton.jsx';
import { OrDivider } from '../../../components/ui/OrDivider.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';
import { ROUTES } from '../../../utils/constants.js';
import { googleAuthEnabled } from '../../../utils/googleAuth.js';

export function RegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: searchParams.get('email') || '' },
  });

  const onSubmit = (values) => {
    registerUser.mutate(values, {
      onSuccess: () => navigate(ROUTES.DASHBOARD, { replace: true }),
    });
  };

  return (
    <div className="space-y-5">
      {googleAuthEnabled && (
        <>
          <GoogleAuthButton />
          <OrDivider />
        </>
      )}

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {registerUser.isError && (
        <Alert tone="error">{extractErrorMessage(registerUser.error, 'Registration failed')}</Alert>
      )}

      <FormField
        label="Full name"
        autoComplete="name"
        register={register('name')}
        error={errors.name?.message}
      />
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        register={register('email')}
        error={errors.email?.message}
      />
      <FormField
        label="Password"
        type="password"
        autoComplete="new-password"
        register={register('password')}
        error={errors.password?.message}
      />

      <Button type="submit" variant="accent" loading={registerUser.isPending} className="w-full">
        CREATE ACCOUNT →
      </Button>

      <p className="text-sm text-(--color-text)/70">
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} className="text-(--color-text) hover:text-(--color-accent) underline">
          Log in
        </Link>
      </p>
    </form>
    </div>
  );
}
