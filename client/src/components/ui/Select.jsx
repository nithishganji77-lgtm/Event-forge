import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export const Select = forwardRef(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full appearance-none border bg-transparent px-4 py-2.5 pr-9 text-sm',
          'focus:outline-none focus:border-(--color-accent)',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
          invalid ? 'border-(--color-accent)' : 'border-(--color-border)',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-(--color-text)/40"
        aria-hidden="true"
      />
    </div>
  );
});
