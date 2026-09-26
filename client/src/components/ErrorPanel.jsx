import { Link } from 'react-router-dom';
import { RotateCw } from 'lucide-react';
import { Button } from './ui/Button.jsx';
import { EmptyState } from './ui/EmptyState.jsx';

// A bundle that fails to load after a new release ("Failed to fetch dynamically imported module")
// is not a bug in the page: the tab is simply running an old build. Say that, and a reload fixes it.
export function isChunkLoadError(error) {
  return /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(String(error?.message ?? ''));
}

// The screen for "the page itself broke". Never shows the error's own text: that is for the console.
export function ErrorPanel({ error, homeTo = '/dashboard' }) {
  const stale = isChunkLoadError(error);

  return (
    <EmptyState
      titleAs="h1"
      title={stale ? 'EventForge has been updated' : 'This page ran into a problem'}
      description={
        stale
          ? 'A newer version is available. Reload the page to continue.'
          : 'Reloading usually fixes it. If it keeps happening, go back to your dashboard and try again.'
      }
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="accent" onClick={() => window.location.reload()}>
            <RotateCw className="size-4" aria-hidden="true" />
            Reload page
          </Button>
          <Button as={Link} to={homeTo} variant="outline">
            Go to dashboard
          </Button>
        </div>
      }
    />
  );
}
