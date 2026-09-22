import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginSchema } from '../schemas/auth.schema.js';
import { useLogin } from '../hooks/useLogin.js';
import { GoogleAuthButton } from './GoogleAuthButton.jsx';
import { OrDivider } from '../../../components/ui/OrDivider.jsx';
import { FormField } from '../../../components/ui/FormField.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';
import { ROUTES } from '../../../utils/constants.js';
import { googleAuthEnabled } from '../../../utils/googleAuth.js';

export function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get('email') || '' },
  });

  const onSubmit = (values) => {
    login.mutate(values, {
      onSuccess: () => navigate(searchParams.get('returnTo') || ROUTES.DASHBOARD, { replace: true }),
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
      {login.isError && <Alert tone="error">{extractErrorMessage(login.error, 'Login failed')}</Alert>}

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
        autoComplete="current-password"
        register={register('password')}
        error={errors.password?.message}
      />

      <div className="flex items-center justify-between">
        <Button type="submit" variant="accent" loading={login.isPending} className="w-full">
          LOGIN →
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link to={ROUTES.FORGOT_PASSWORD} className="text-(--color-text)/70 hover:text-(--color-accent)">
          Forgot password?
        </Link>
        <Link to={ROUTES.REGISTER} className="text-(--color-text)/70 hover:text-(--color-accent)">
          Create account
        </Link>
      </div>
    </form>
    </div>
  );
}
