import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey.js';
import { cn } from '../../lib/cn.js';

const MenuContext = createContext({ close: () => {} });

const ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])';

// Action menu (ARIA "menu button" pattern): a trigger that opens a panel of menuitems reachable by
// Arrow/Home/End, closed by Escape (focus returns to the trigger), Tab, click-outside or selecting
// an item. Used for the user menu and each event card's "⋯" menu.
//
// `trigger` is a render function so the caller owns the trigger's look:
//   trigger={({ triggerProps }) => <button {...triggerProps}>…</button>}
export function DropdownMenu({ trigger, children, label, align = 'end', panelClassName }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const initialFocus = useRef('first');
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  function close({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  useEscapeKey(open, () => close());

  useEffect(() => {
    if (!open) return undefined;
    function onMouseDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const items = panelRef.current?.querySelectorAll(ITEM_SELECTOR);
    if (!items?.length) return;
    (initialFocus.current === 'last' ? items[items.length - 1] : items[0]).focus();
  }, [open]);

  function onTriggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      initialFocus.current = event.key === 'ArrowUp' ? 'last' : 'first';
      setOpen(true);
    }
  }

  function onPanelKeyDown(event) {
    const items = [...panelRef.current.querySelectorAll(ITEM_SELECTOR)];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement);

    let next = null;
    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length];
    else if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
    else if (event.key === 'Home') next = items[0];
    else if (event.key === 'End') next = items[items.length - 1];
    else if (event.key === 'Tab') {
      // The menu pattern: Tab leaves the menu (and closes it) instead of tabbing through items.
      setOpen(false);
      return;
    }

    if (next) {
      event.preventDefault();
      next.focus();
    }
  }

  const triggerProps = {
    ref: triggerRef,
    type: 'button',
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
    onClick: () => {
      initialFocus.current = 'first';
      setOpen((value) => !value);
    },
    onKeyDown: onTriggerKeyDown,
  };

  return (
    <MenuContext.Provider value={{ close }}>
      <div className="relative" ref={containerRef}>
        {trigger({ triggerProps, open })}
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              id={panelId}
              role="menu"
              aria-label={label}
              onKeyDown={onPanelKeyDown}
              className={cn(
                'absolute top-full mt-1.5 z-40 min-w-52 p-1',
                'border border-(--color-border) bg-(--color-surface) rounded-(--ef-radius)',
                'shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]',
                align === 'end' ? 'right-0' : 'left-0',
                panelClassName
              )}
              initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={{ duration: reduceMotion ? 0 : 0.12 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MenuContext.Provider>
  );
}

const ITEM_CLASSES = cn(
  'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-(--ef-radius-sm) cursor-pointer',
  'text-(--color-text)/80 hover:text-(--color-text) hover:bg-(--color-bg-secondary) focus:bg-(--color-bg-secondary)',
  'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--color-accent)',
  'aria-disabled:opacity-40 aria-disabled:cursor-not-allowed'
);

// `as` lets an item be a router <Link> (navigation) instead of a button (action). Selecting a link
// item closes the menu without stealing focus back (the page is changing); selecting an action
// closes it and returns focus to the trigger first, so a dialog the action opens remembers a
// stable element to return to.
export function DropdownMenuItem({
  as: Component = 'button',
  icon: Icon,
  onSelect,
  destructive = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const { close } = useContext(MenuContext);
  const isButton = Component === 'button';

  return (
    <Component
      role="menuitem"
      tabIndex={-1}
      {...(isButton ? { type: 'button' } : {})}
      aria-disabled={disabled || undefined}
      className={cn(ITEM_CLASSES, destructive && 'text-(--color-accent) hover:text-(--color-accent)', className)}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onSelect?.(event);
        close({ restoreFocus: isButton });
      }}
      {...props}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      {children}
    </Component>
  );
}

// One option of a mutually exclusive group (e.g. theme). Stays open-and-closes like any item.
export function DropdownMenuRadioItem({ checked, onSelect, children, ...props }) {
  return (
    <DropdownMenuItem
      role="menuitemradio"
      aria-checked={checked}
      onSelect={onSelect}
      className="justify-between"
      {...props}
    >
      <span className="flex items-center gap-2.5">{children}</span>
      {checked && <Check className="size-4 text-(--color-accent)" aria-hidden="true" />}
    </DropdownMenuItem>
  );
}

export function DropdownMenuLabel({ children }) {
  return <p className="text-meta text-(--color-text)/40 px-3 pt-2 pb-1">{children}</p>;
}

export function DropdownMenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-(--color-border)" />;
}
