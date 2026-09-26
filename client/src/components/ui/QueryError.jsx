import { Link } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './Button.jsx';
import { getErrorInfo } from '../../lib/errors.js';
import { cn } from '../../lib/cn.js';

// What a page or panel shows when the data it needs could not be loaded: a headline for what was
// being loaded, the reason in plain words, and, only when trying again could help (a dropped
// connection, a server hiccup), a "Try again" button. A 403 or 404 gets no retry: asking again
// gets the same answer, so `backTo` offers a way out instead.
export function QueryError({ error, title = 'Something went wrong', onRetry, isRetrying = false, backTo, className }) {
  const info = getErrorInfo(error);
  const canRetry = Boolean(onRetry) && (info.retryable || info.kind === 'unknown');

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-wrap items-start gap-x-4 gap-y-3 rounded-(--ef-radius) border border-(--color-accent) bg-(--color-surface) p-5',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-(--color-accent)" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-(--color-text)/70">{info.message ?? 'Please try again in a moment.'}</p>
      </div>
      {(canRetry || backTo) && (
        <div className="flex flex-wrap gap-2">
          {canRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} loading={isRetrying}>
              <RotateCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          )}
          {backTo && (
            <Button as={Link} to={backTo.to} size="sm" variant="outline">
              {backTo.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
