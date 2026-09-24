import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';
import { cn } from '../../../lib/cn.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { useEscapeKey } from '../../../hooks/useEscapeKey.js';
import { ROUTES } from '../../../utils/constants.js';

// A workspace card, not a text link: it names the organization you're acting in and makes clear
// this is where you switch. `collapsed` shrinks it to the initial for the sidebar's icon rail.
export function OrgSwitcher({ collapsed = false }) {
  const { memberships } = useAuth();
  const { organizationSlug } = useActiveOrganization();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Refocus the trigger only on Escape-close, not click-outside/option-select — those already
  // establish their own next focus target (whatever was clicked, or the page being navigated to).
  useEscapeKey(open, () => {
    setOpen(false);
    triggerRef.current?.focus();
  });

  const current = memberships.find((m) => m.organizationSlug === organizationSlug);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 border border-(--color-border) bg-(--color-surface) rounded-(--ef-radius) p-2 text-left',
          'transition-colors hover:border-(--color-text)/25',
          collapsed && 'justify-center p-1.5',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={collapsed ? `Organization: ${current?.organizationName || 'none selected'}. Switch organization` : undefined}
        title={collapsed ? current?.organizationName : undefined}
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-(--ef-radius-sm) bg-(--color-text) text-(--color-bg) text-sm font-semibold"
        >
          {(current?.organizationName || '?').charAt(0).toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight">
                {current?.organizationName || 'Select organization'}
              </span>
              <span className="block text-xs text-(--color-text)/50">Organization</span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-(--color-text)/40" aria-hidden="true" />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            className="absolute left-0 top-full mt-1.5 w-full min-w-56 max-w-[calc(100vw-2rem)] p-1 border border-(--color-border) bg-(--color-surface) rounded-(--ef-radius) shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] z-40"
            initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: reduceMotion ? 0 : 0.12 }}
          >
            {memberships.map((m) => (
              <button
                key={m.organizationId}
                role="option"
                aria-selected={m.organizationSlug === organizationSlug}
                onClick={() => {
                  setOpen(false);
                  navigate(ROUTES.orgDashboard(m.organizationSlug));
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-(--ef-radius-sm) hover:bg-(--color-bg-secondary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--color-accent)"
              >
                {m.organizationName}
                {m.organizationSlug === organizationSlug && <Check className="size-4 text-(--color-accent)" aria-hidden="true" />}
              </button>
            ))}
            <Link
              to={ROUTES.ONBOARDING}
              onClick={() => setOpen(false)}
              className="mt-1 w-full flex items-center gap-2 px-3 py-2 text-sm border-t border-(--color-border) text-(--color-text)/70 rounded-(--ef-radius-sm) hover:bg-(--color-bg-secondary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--color-accent)"
            >
              <Plus className="size-4" aria-hidden="true" />
              Create organization
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
