export function EmptyState({ title, description, action }) {
  return (
    <div className="border border-dashed border-(--color-border) px-8 py-16 text-center">
      <p className="text-lg font-medium mb-2">{title}</p>
      {description && <p className="text-sm text-(--color-text)/60 mb-6 max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  );
}
