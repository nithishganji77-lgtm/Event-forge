import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { RegisterForm } from '../../features/auth/components/RegisterForm.jsx';

export function RegisterPage() {
  return (
    <AuthLayout eyebrow="GET STARTED" title="Create your account">
      <RegisterForm />
    </AuthLayout>
  );
}
