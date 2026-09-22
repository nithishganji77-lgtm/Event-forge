import { FileEdit, CircleCheck, CircleSlash, Radio, CheckCheck, XCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge.jsx';

export const EVENT_STATUS_CONFIG = {
  DRAFT: { tone: 'neutral', icon: FileEdit, label: 'Draft' },
  REGISTRATION_OPEN: { tone: 'accent', icon: CircleCheck, label: 'Registration Open' },
  REGISTRATION_CLOSED: { tone: 'neutral', icon: CircleSlash, label: 'Registration Closed' },
  ONGOING: { tone: 'accent', icon: Radio, label: 'Ongoing' },
  COMPLETED: { tone: 'neutral', icon: CheckCheck, label: 'Completed' },
  CANCELLED: { tone: 'neutral', icon: XCircle, label: 'Cancelled' },
};

// Never color-only — every status pairs a badge tone with a distinct icon + text label.
export function EventStatusBadge({ status }) {
  const config = EVENT_STATUS_CONFIG[status] || EVENT_STATUS_CONFIG.DRAFT;
  const Icon = config.icon;
  return (
    <Badge tone={config.tone}>
      <Icon className="size-3" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
