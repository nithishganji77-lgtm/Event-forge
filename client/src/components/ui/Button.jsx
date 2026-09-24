import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const VARIANTS = {
  primary: 'bg-(--color-text) text-(--color-bg) hover:bg-(--color-accent) hover:text-(--color-accent-foreground)',
  accent: 'bg-(--color-accent) text-(--color-accent-foreground) hover:opacity-90',
  outline: 'border border-(--color-text) text-(--color-text) hover:bg-(--color-text) hover:text-(--color-bg)',
  ghost: 'text-(--color-text) hover:bg-(--color-bg-secondary)',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
};

export const Button = forwardRef(function Button(
  { as: Component = 'button', className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref
) {
  const isButtonEl = Component === 'button';

  return (
    <Component
      ref={ref}
      {...(isButtonEl ? { disabled: disabled || loading } : {})}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-colors duration-150 rounded-(--ef-radius-sm)',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </Component>
  );
});
