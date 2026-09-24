import { cn } from '../../lib/cn.js';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('border border-(--color-border) bg-(--color-surface) rounded-(--ef-radius) p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}
