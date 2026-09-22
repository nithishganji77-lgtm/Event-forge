import { AuthLayout } from '../../layouts/AuthLayout.jsx';
import { ResetPasswordForm } from '../../features/auth/components/ResetPasswordForm.jsx';

export function ResetPasswordPage() {
  return (
    <AuthLayout eyebrow="ACCOUNT RECOVERY" title="Choose a new password">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
