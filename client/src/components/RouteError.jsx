import { useRouteError } from 'react-router-dom';
import { ErrorPanel } from './ErrorPanel.jsx';

// The router's fallback for anything outside the dashboard layout (landing, sign-in, invite links),
// replacing React Router's default "Unexpected Application Error!" and its stack trace.
export function RouteError() {
  const error = useRouteError();
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <ErrorPanel error={error} homeTo="/" />
    </div>
  );
}
