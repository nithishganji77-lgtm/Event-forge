import { Check } from 'lucide-react';
import { cn } from '../../../../lib/cn.js';

export function WizardProgress({ steps, currentStep }) {
  return (
    <ol className="flex flex-wrap gap-6 mb-10 border-b border-(--color-border) pb-6">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isDone = index < currentStep;
        return (
          <li
            key={step.key}
            aria-current={isActive ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 text-meta',
              isActive ? 'text-(--color-accent)' : isDone ? 'text-(--color-text)' : 'text-(--color-text)/40'
            )}
          >
            {isDone ? (
              <Check className="size-3.5" aria-hidden="true" />
            ) : (
              <span>{String(index + 1).padStart(2, '0')}</span>
            )}
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
