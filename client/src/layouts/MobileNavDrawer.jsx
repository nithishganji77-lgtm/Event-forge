import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { Logo } from '../components/Logo.jsx';
import { SidebarNav } from './SidebarNav.jsx';
import { useEscapeKey } from '../hooks/useEscapeKey.js';
import { useFocusTrap } from '../hooks/useFocusTrap.js';

// A separate component from Modal, not a variant prop on it — a drawer is edge-anchored/full-height/
// horizontal-slide vs. Modal's centered/width-capped/vertical-slide, genuinely different shapes.
// What IS shared (Escape-close, Tab-trap, initial-focus, focus-return, portal, motion gating) comes
// from the same two hooks Modal itself uses, so the only real duplication here is JSX layout.
export function MobileNavDrawer({ open, onClose, organizationSlug }) {
  const drawerRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEscapeKey(open, onClose);
  useFocusTrap(drawerRef, open);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-(--color-text)/40 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={drawerRef}
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="h-full w-72 max-w-[85vw] bg-(--color-bg) border-r border-(--color-border) py-6 flex flex-col"
            initial={{ x: reduceMotion ? 0 : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : '-100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <div className="flex items-center justify-between px-4 mb-8">
              <Logo />
              <button
                onClick={onClose}
                aria-label="Close navigation menu"
                className="text-(--color-text)/60 hover:text-(--color-text) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarNav organizationSlug={organizationSlug} ariaLabel="Mobile navigation" onNavigate={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
