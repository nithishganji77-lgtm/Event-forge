import { useId } from 'react';
import { Label } from './Label.jsx';
import { Input } from './Input.jsx';

// `as` defaults to Input (every existing call site's behavior, unchanged) — pass as={Select} or
// as={Textarea} to get the same aria-invalid/aria-describedby/role="alert" wiring for those fields,
// which previously had none. Mirrors Button.jsx's `as: Component = 'button'` polymorphic pattern
// rather than inventing separate SelectField/TextareaField components.
export function FormField({ as: Field = Input, label, error, register, type = 'text', children, ...fieldProps }) {
  const id = useId();
  const errorId = `${id}-error`;
  const isInput = Field === Input;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Field
        id={id}
        {...(isInput ? { type } : {})}
        invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...register}
        {...fieldProps}
      >
        {children}
      </Field>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-(--color-accent)">
          {error}
        </p>
      )}
    </div>
  );
}
