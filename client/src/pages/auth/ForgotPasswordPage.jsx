import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { ForgotPasswordForm } from '../../features/auth/components/ForgotPasswordForm.jsx';

export function ForgotPasswordPage() {
  return (
    <AuthLayout eyebrow="ACCOUNT RECOVERY" title="Reset your password">
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
