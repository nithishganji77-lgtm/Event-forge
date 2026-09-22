import { useRef } from 'react';
import { cn } from '../../lib/cn.js';

export function tabId(id, key) {
  return `${id}-tab-${key}`;
}

export function panelId(id, key) {
  return `${id}-panel-${key}`;
}

// Automatic-activation tabs per the ARIA APG pattern: arrow keys both move focus and select the
// tab immediately (appropriate here since every consumer's panel swap is a cheap conditional
// render, not an expensive fetch). overflow-x-auto + flex-nowrap (not flex-wrap, which would break
// the border-b/-mb-px underline treatment) is the same horizontal-scroll fallback now used for
// tables/MonthView, so a 5-tab bar can't clip off-screen with no way to reach the rest.
export function Tabs({ id, tabs, active, onChange }) {
  const buttonRefs = useRef({});

  function focusTab(key) {
    buttonRefs.current[key]?.focus();
  }

  function onKeyDown(event, index) {
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const nextKey = tabs[nextIndex].key;
    onChange(nextKey);
    focusTab(nextKey);
  }

  return (
    <div role="tablist" className="flex flex-nowrap gap-6 border-b border-(--color-border) mb-6 overflow-x-auto">
      {tabs.map((tab, index) => (
        <button
          key={tab.key}
          ref={(el) => {
            buttonRefs.current[tab.key] = el;
          }}
          role="tab"
          id={id ? tabId(id, tab.key) : undefined}
          aria-controls={id ? panelId(id, tab.key) : undefined}
          aria-selected={active === tab.key}
          tabIndex={active === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
          onKeyDown={(e) => onKeyDown(e, index)}
          className={cn(
            'text-meta pb-3 border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
            active === tab.key
              ? 'border-(--color-accent) text-(--color-text)'
              : 'border-transparent text-(--color-text)/50 hover:text-(--color-text)'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
