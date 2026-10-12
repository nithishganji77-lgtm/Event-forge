import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../hooks/useGoogleAuth.js';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';
import { ROUTES } from '../../../utils/constants.js';

// Google's button only takes a width in pixels, between 200 and 400. Anything else (such as "100%")
// is rejected after it first renders, and it redraws at its own narrow default.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

// Renders nothing if Google sign-in isn't configured (no VITE_GOOGLE_CLIENT_ID) — the caller
// wraps this in the GoogleOAuthProvider check, this component just handles the request/error UX.
export function GoogleAuthButton() {
  const navigate = useNavigate();
  const googleAuth = useGoogleAuth();
  const slotRef = useRef(null);
  const [width, setWidth] = useState(null);

  // Fit the button to the form's width, and follow it when the window is resized.
  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return undefined;
    const fit = () => setWidth(Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, slot.clientWidth))));
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(fit);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-3">
      {googleAuth.isError && (
        <Alert tone="error">{extractErrorMessage(googleAuth.error, 'Google sign-in did not work. Please try again.')}</Alert>
      )}
      {/* color-scheme: light matches Google's light iframe; on a dark page a mismatch makes the
          browser paint an opaque white box behind the button. */}
      <div ref={slotRef} className="flex justify-center [color-scheme:light]">
        {width && (
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
            width={width}
          />
        )}
      </div>
    </div>
  );
}
