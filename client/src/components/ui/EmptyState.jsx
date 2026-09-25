import { cn } from '../../lib/cn.js';

// `icon` puts a small glyph above the title, and `compact` shrinks the padding for empty states
// inside a narrow column (the dashboard's side rail). Both are optional: every existing use renders
// exactly as before.
export function EmptyState({ title, description, action, icon: Icon, compact = false }) {
  return (
    <div
      className={cn(
        'border border-dashed border-(--color-border) rounded-(--ef-radius) text-center',
        compact ? 'px-5 py-8' : 'px-8 py-16'
      )}
    >
      {Icon && (
        <span className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-(--color-bg-secondary)">
          <Icon className="size-5 text-(--color-text)/50" aria-hidden="true" />
        </span>
      )}
      <p className={cn('font-medium mb-2', compact ? 'text-base' : 'text-lg')}>{title}</p>
      {description && (
        <p className={cn('text-sm text-(--color-text)/60 max-w-sm mx-auto', action && 'mb-6')}>{description}</p>
      )}
      {action}
    </div>
  );
}
