import { Check } from 'lucide-react';
import { useRegister, useCancelRegistration } from '../hooks/useRegistration.js';
import { Button } from '../../../components/ui/Button.jsx';

// Always calls the same mutation regardless of the pre-click label — the server is authoritative
// on the actual outcome (e.g. REGISTER might still land WAITLISTED if someone else just filled
// the last spot), and success invalidates the event query so this re-renders from server truth.
// `detailed` is the event page's wording ("You're registered" / "Cancel registration"); the
// default is the terse card wording.
export function RegisterButton({ event, className, detailed = false }) {
  const register = useRegister(event._id);
  const cancelRegistration = useCancelRegistration(event._id);

  if (event.myRegistrationStatus === 'REGISTERED' || event.myRegistrationStatus === 'WAITLISTED') {
    const confirmed = event.myRegistrationStatus === 'REGISTERED';
    const label = detailed ? (confirmed ? "You're registered" : "You're on the waitlist") : confirmed ? 'REGISTERED' : 'ON WAITLIST';
    return (
      <div
        className={`flex items-center gap-3 ${
          detailed ? 'rounded-(--ef-radius-sm) border border-(--color-border) bg-(--color-surface) px-4 py-2' : ''
        } ${className || ''}`}
      >
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-(--color-text)">
          {confirmed && <Check className="size-4 text-(--color-accent)" aria-hidden="true" />}
          {label}
        </span>
        <button
          onClick={() => cancelRegistration.mutate()}
          disabled={cancelRegistration.isPending}
          className="text-sm text-(--color-text)/50 hover:text-(--color-accent) underline"
        >
          {cancelRegistration.isPending ? 'Cancelling…' : detailed ? 'Cancel registration' : 'Cancel'}
        </button>
      </div>
    );
  }

  if (event.displayStatus !== 'REGISTRATION_OPEN') {
    return (
      <Button variant="outline" disabled className={className}>
        REGISTRATION CLOSED
      </Button>
    );
  }

  const isFull = event.registeredCount >= event.capacity;

  return (
    <Button
      variant="accent"
      loading={register.isPending}
      onClick={() => register.mutate()}
      className={className}
    >
      {register.isPending ? 'REGISTERING…' : isFull ? 'JOIN WAITLIST' : 'REGISTER →'}
    </Button>
  );
}
