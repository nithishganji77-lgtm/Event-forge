import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useMyNotifications } from '../hooks/useMyNotifications.js';
import { useMarkNotificationRead } from '../hooks/useMarkNotificationRead.js';
import { useMarkAllNotificationsRead } from '../hooks/useMarkAllNotificationsRead.js';
import { NotificationItem } from './NotificationItem.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

const PANEL_FILTERS = { page: 1, limit: 8 };
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)';

// Rendered inside NotificationBell's own <AnimatePresence> (see NotificationBell.jsx), so this
// component only needs to declare its own enter/exit values, not own the presence toggle.
export function NotificationPanel({ onClose }) {
  const { organizationSlug } = useActiveOrganization();
  const { data, isLoading } = useMyNotifications(PANEL_FILTERS);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const reduceMotion = useReducedMotion();

  const hasUnread = data?.data.some((n) => !n.read);

  return (
    <motion.div
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full mt-1.5 w-[calc(100vw-2rem)] max-w-80 overflow-hidden border border-(--color-border) bg-(--color-surface) rounded-(--ef-radius) shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] z-40"
      initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
      transition={{ duration: reduceMotion ? 0 : 0.12 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-(--color-border)">
        <span className="text-meta">NOTIFICATIONS</span>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className={`text-meta text-(--color-text)/60 hover:text-(--color-accent) ${FOCUS_RING}`}
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading && <Spinner />}

      {data && data.data.length === 0 && (
        <EmptyState title="No notifications yet" description="Updates on your events will show up here." />
      )}

      {data && data.data.length > 0 && (
        <ul className="max-h-96 overflow-y-auto divide-y divide-(--color-border)">
          {data.data.map((notification) => (
            <li key={notification._id}>
              <NotificationItem
                notification={notification}
                onRead={(id) => markRead.mutate(id)}
              />
            </li>
          ))}
        </ul>
      )}

      <Link
        to={ROUTES.orgNotifications(organizationSlug)}
        onClick={onClose}
        className={`block text-center text-meta px-4 py-3 border-t border-(--color-border) text-(--color-text)/70 hover:bg-(--color-bg-secondary) ${FOCUS_RING}`}
      >
        View all
      </Link>
    </motion.div>
  );
}
