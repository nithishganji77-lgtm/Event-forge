import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { useEscapeKey } from '../../../hooks/useEscapeKey.js';
import { ROUTES } from '../../../utils/constants.js';

export function OrgSwitcher() {
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
        className="flex items-center gap-2 text-sm font-medium hover:text-(--color-accent) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.organizationName || 'Select organization'}
        <ChevronsUpDown className="size-3.5 text-(--color-text)/40" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] max-w-64 border border-(--color-border) bg-(--color-bg) shadow-sm z-40"
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
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-(--color-bg-secondary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
              >
                {m.organizationName}
                {m.organizationSlug === organizationSlug && <Check className="size-4 text-(--color-accent)" aria-hidden="true" />}
              </button>
            ))}
            <Link
              to={ROUTES.ONBOARDING}
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm border-t border-(--color-border) text-(--color-text)/70 hover:bg-(--color-bg-secondary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
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
