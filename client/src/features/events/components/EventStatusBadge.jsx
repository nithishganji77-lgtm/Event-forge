import { FileEdit, CircleCheck, CircleSlash, Radio, CheckCheck, XCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';
import { getPresentationStatus } from '../utils/presentationStatus.js';
import { useNow } from '../../../hooks/useNow.js';

// Keyed by the server's displayStatus. The calendar grid still renders its chips from this map;
// everything else uses the presentation status below.
export const EVENT_STATUS_CONFIG = {
  DRAFT: { tone: 'neutral', icon: FileEdit, label: 'Draft' },
  REGISTRATION_OPEN: { tone: 'accent', icon: CircleCheck, label: 'Registration Open' },
  REGISTRATION_CLOSED: { tone: 'neutral', icon: CircleSlash, label: 'Registration Closed' },
  ONGOING: { tone: 'accent', icon: Radio, label: 'Ongoing' },
  COMPLETED: { tone: 'neutral', icon: CheckCheck, label: 'Completed' },
  CANCELLED: { tone: 'neutral', icon: XCircle, label: 'Cancelled' },
};

// Never color-only — every status pairs a badge tone with a distinct icon + text label. Pass
// `event` for the full presentation status (including the STARTS IN countdown), or just `status`
// (a displayStatus) when that's all that's known.
export function EventStatusBadge({ event, status, className }) {
  const now = useNow();
  const presentation = getPresentationStatus(event ?? { displayStatus: status }, now);
  const Icon = presentation.icon;

  return (
    <Badge tone={presentation.tone} className={className}>
      <Icon className="size-3" aria-hidden="true" />
      {presentation.label}
    </Badge>
  );
}
