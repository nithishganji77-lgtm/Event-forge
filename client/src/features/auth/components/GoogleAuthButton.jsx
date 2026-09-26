import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../hooks/useGoogleAuth.js';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';
import { ROUTES } from '../../../utils/constants.js';

// Renders nothing if Google sign-in isn't configured (no VITE_GOOGLE_CLIENT_ID) — the caller
// wraps this in the GoogleOAuthProvider check, this component just handles the request/error UX.
export function GoogleAuthButton() {
  const navigate = useNavigate();
  const googleAuth = useGoogleAuth();

  return (
    <div className="space-y-3">
      {googleAuth.isError && (
        <Alert tone="error">{extractErrorMessage(googleAuth.error, 'Google sign-in did not work. Please try again.')}</Alert>
      )}
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          googleAuth.mutate(
            { credential: credentialResponse.credential },
            { onSuccess: () => navigate(ROUTES.DASHBOARD, { replace: true }) }
          );
        }}
        onError={() => googleAuth.reset()}
        theme="outline"
        shape="rectangular"
        width="100%"
      />
    </div>
  );
}
