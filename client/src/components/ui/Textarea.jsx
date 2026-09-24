import { forwardRef } from 'react';
import { cn } from '../../lib/cn.js';

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full border bg-transparent px-4 py-2.5 text-sm text-(--color-text) placeholder:text-(--color-text)/40 rounded-(--ef-radius-sm)',
        'transition-colors duration-150 focus:outline-none focus:border-(--color-accent) resize-y',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
        invalid ? 'border-(--color-accent)' : 'border-(--color-border)',
        className
      )}
      {...props}
    />
  );
});
