import { Link } from 'react-router-dom';
import { CalendarPlus, PencilLine, Ban, CheckCircle2, Clock, AlarmClock } from 'lucide-react';
import { relativeTime } from '../../../utils/relativeTime.js';
import { ROUTES } from '../../../utils/constants.js';
import { cn } from '../../../lib/cn.js';

// One consumer at ship time — kept inline rather than pre-emptively extracted, same reasoning
// applied to not extracting the audit-log ACTION_LABELS map before it had a second consumer.
const TYPE_ICONS = {
  EVENT_PUBLISHED: CalendarPlus,
  EVENT_UPDATED: PencilLine,
  EVENT_CANCELLED: Ban,
  REGISTRATION_CONFIRMED: CheckCircle2,
  REGISTRATION_WAITLISTED: Clock,
  REGISTRATION_CANCELLED: Ban,
  DEADLINE_APPROACHING: AlarmClock,
};

export function NotificationItem({ notification, onRead }) {
  const Icon = TYPE_ICONS[notification.type] || Clock;
  // Every trigger points relatedEntityType/Id at the Event (never the EventRegistration — there's
  // no standalone page for one), so this is a uniform check regardless of notification type.
  const href =
    notification.relatedEntityType === 'Event' && notification.organization?.slug
      ? ROUTES.orgEventDetail(notification.organization.slug, notification.relatedEntityId)
      : null;

  const handleClick = () => {
    if (!notification.read && onRead) onRead(notification._id);
  };

  const body = (
    <div className={cn('flex items-start gap-3 px-4 py-3 text-sm', !notification.read && 'bg-(--color-bg-secondary)')}>
      <Icon className="size-4 mt-0.5 shrink-0 text-(--color-text)/60" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium', !notification.read && 'font-semibold')}>
          {!notification.read && <span className="sr-only">Unread: </span>}
          {notification.title}
        </p>
        <p className="text-(--color-text)/70">{notification.message}</p>
        <p className="text-meta text-(--color-text)/40 mt-1">
          {notification.organization?.name} · {relativeTime(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <span className="size-2 rounded-full bg-(--color-accent) mt-1.5 shrink-0" aria-hidden="true" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        onClick={handleClick}
        className="block hover:bg-(--color-bg-secondary) transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)"
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left hover:bg-(--color-bg-secondary) transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-accent)"
    >
      {body}
    </button>
  );
}
