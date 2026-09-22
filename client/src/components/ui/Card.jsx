import { cn } from '../../lib/cn.js';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('border border-(--color-border) bg-(--color-bg) p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
