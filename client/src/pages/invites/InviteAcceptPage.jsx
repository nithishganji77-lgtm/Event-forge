import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useInvitePreview, useAcceptInvite } from '../../features/invites/hooks/useInvitePreview.js';
import { useLogout } from '../../features/auth/hooks/useLogout.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { extractErrorMessage } from '../../lib/axios.js';
import { ROUTES } from '../../utils/constants.js';

export function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: preview, isLoading, isError } = useInvitePreview(token);
  const acceptInvite = useAcceptInvite();
  const logout = useLogout();

  const returnTo = `${ROUTES.INVITE_ACCEPT}?token=${token}`;

  if (!token) {
    return <Message title="Missing invite token" description="This link is incomplete." />;
  }

  if (isLoading || authLoading) {
    return <Spinner />;
  }

  if (isError || !preview) {
    return <Message title="Invite not found" description="This invite link is invalid." />;
  }

  if (preview.status === 'REVOKED') {
    return <Message title="Invite revoked" description="This invitation is no longer valid." />;
  }
  if (preview.status === 'ACCEPTED') {
    return (
      <Message title="Already accepted" description="This invite has already been used.">
        <Link to={ROUTES.LOGIN} className="text-(--color-accent) underline">
          Log in
        </Link>
      </Message>
    );
  }
  if (preview.isExpired) {
    return <Message title="Invite expired" description="Ask the organization admin to send a new one." />;
  }

  if (!isAuthenticated) {
    return (
      <Message
        title={`Join ${preview.organizationName}`}
        description={`You've been invited as ${preview.role.replace('_', ' ').toLowerCase()}. Create an account or log in with ${preview.email} to accept.`}
      >
        <div className="flex gap-3 justify-center">
          <Button as={Link} to={`${ROUTES.REGISTER}?email=${encodeURIComponent(preview.email)}`} variant="accent">
            Create account
          </Button>
          <Button
            as={Link}
            to={`${ROUTES.LOGIN}?email=${encodeURIComponent(preview.email)}&returnTo=${encodeURIComponent(returnTo)}`}
            variant="outline"
          >
            Log in
          </Button>
        </div>
      </Message>
    );
  }

  if (user.email.toLowerCase() !== preview.email.toLowerCase()) {
    return (
      <Message
        title="Wrong account"
        description={`You're logged in as ${user.email}, but this invite was sent to ${preview.email}.`}
      >
        <Button variant="outline" onClick={() => logout.mutate()}>
          Log out and try again
        </Button>
      </Message>
    );
  }

  return (
    <Message
      title={`Join ${preview.organizationName}`}
      description={`You've been invited as ${preview.role.replace('_', ' ').toLowerCase()}.`}
    >
      {acceptInvite.isError && (
        <Alert tone="error">{extractErrorMessage(acceptInvite.error, 'Could not accept invite')}</Alert>
      )}
      <Button
        variant="accent"
        loading={acceptInvite.isPending}
        onClick={() =>
          acceptInvite.mutate(token, {
            onSuccess: (data) => navigate(ROUTES.orgDashboard(data.organizationSlug), { replace: true }),
          })
        }
      >
        Accept invite →
      </Button>
    </Message>
  );
}

function Message({ title, description, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--color-bg) text-(--color-text) px-6 text-center">
      <div className="max-w-sm space-y-5">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-(--color-text)/60">{description}</p>}
        {children}
      </div>
    </div>
  );
}
