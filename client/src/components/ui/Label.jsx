export function Label({ className = '', children, ...props }) {
  return (
    <label className={`text-meta block mb-2 ${className}`} {...props}>
      {children}
    </label>
  );
}
