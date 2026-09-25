import { cn } from '../../../../lib/cn.js';

// The one surface used on the event page: a card a step lighter than the page, with a small
// uppercase title. Kept deliberately plain so the page reads hero, stats, tabs, panels, not a wall
// of boxes.
export function Panel({ title, action, className, children, ...props }) {
  return (
    <section
      className={cn('rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6', className)}
      {...props}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-meta text-(--color-text)/50">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
