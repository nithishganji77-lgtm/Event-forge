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
import { useServerFormErrors } from '../../../hooks/useServerFormErrors.js';
import { ROUTES } from '../../../utils/constants.js';
import { googleAuthEnabled } from '../../../utils/googleAuth.js';

const FIELDS = ['name', 'email', 'password'];

export function RegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registerUser = useRegister();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: searchParams.get('email') || '' },
  });

  const { alertMessage, onError, clear } = useServerFormErrors(setError, FIELDS);

  const onSubmit = (values) => {
    clear();
    registerUser.mutate(values, {
      onSuccess: () => navigate(ROUTES.DASHBOARD, { replace: true }),
      onError,
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
      {alertMessage && <Alert tone="error">{alertMessage}</Alert>}

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
