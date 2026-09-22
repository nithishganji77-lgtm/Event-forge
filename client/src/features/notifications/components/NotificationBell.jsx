import { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '../hooks/useUnreadCount.js';
import { useEscapeKey } from '../../../hooks/useEscapeKey.js';
import { NotificationPanel } from './NotificationPanel.jsx';

// Dropdown mechanics copied from OrgSwitcher.jsx's established useState/useRef/click-outside
// pattern rather than introducing a new popover primitive.
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const { count } = useUnreadCount();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Refocus the trigger only on Escape-close, matching OrgSwitcher's same reasoning — click-outside
  // already has its own next focus target.
  useEscapeKey(open, () => {
    setOpen(false);
    triggerRef.current?.focus();
  });

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative text-(--color-text)/60 hover:text-(--color-accent) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
      >
        <Bell className="size-4" aria-hidden="true" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 min-w-[1rem] h-4 px-1 rounded-full bg-(--color-accent) text-white text-[10px] leading-4 text-center"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && <NotificationPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
