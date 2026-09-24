import { cn } from '../../lib/cn.js';

const TONES = {
  neutral: 'border-(--color-border) text-(--color-text)',
  accent: 'border-(--color-accent) text-(--color-accent)',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'text-meta inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-(--ef-radius-sm)',
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
