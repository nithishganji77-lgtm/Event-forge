export function OrDivider({ children = 'or continue with email' }) {
  return (
    <div className="flex items-center gap-3 text-meta text-(--color-text)/40">
      <span className="h-px flex-1 bg-(--color-border)" />
      {children}
      <span className="h-px flex-1 bg-(--color-border)" />
    </div>
  );
}
