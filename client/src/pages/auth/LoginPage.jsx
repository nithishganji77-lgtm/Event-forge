import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { LoginForm } from '../../features/auth/components/LoginForm.jsx';

export function LoginPage() {
  return (
    <AuthLayout eyebrow="WELCOME BACK" title="Log in to EventForge">
      <LoginForm />
    </AuthLayout>
  );
}
