import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';

// `md` is the confirm-dialog size every existing caller gets. `xl` is for a workspace inside a modal
// (ForgeAI): wider, and it scrolls within the viewport instead of running off the bottom of it.
const SIZES = {
  md: 'max-w-lg',
  xl: 'max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto',
};

export function Modal({ open, onClose, title, size = 'md', children }) {
  const dialogRef = useRef(null);
  const reduceMotion = useReducedMotion();

  useEscapeKey(open, onClose);
  useFocusTrap(dialogRef, open);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-text)/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn('w-full border border-(--color-border) bg-(--color-surface) rounded-(--ef-radius) p-6', SIZES[size])}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="text-(--color-text)/60 hover:text-(--color-text)"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
