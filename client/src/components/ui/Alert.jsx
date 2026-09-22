import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const TONES = {
  error: { icon: AlertTriangle, classes: 'border-(--color-accent) text-(--color-accent)' },
  success: { icon: CheckCircle2, classes: 'border-(--color-text) text-(--color-text)' },
};

export function Alert({ tone = 'error', children, className }) {
  const { icon: Icon, classes } = TONES[tone];
  return (
    <div
      role="alert"
      className={cn('flex items-start gap-2.5 border px-4 py-3 text-sm', classes, className)}
    >
      <Icon className="size-4 mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
