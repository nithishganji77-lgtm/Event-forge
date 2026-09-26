// Quick-start buttons. `chips` are strings or { label }. They are buttons, not tabs or radios: each
// one does something when pressed.
export function PromptChips({ chips, onPick, label, disabled = false }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const text = typeof chip === 'string' ? chip : chip.label;
        return (
          <button
            key={text}
            type="button"
            disabled={disabled}
            onClick={() => onPick(chip)}
            className="rounded-full border border-(--color-border) bg-(--color-surface) px-3 py-1.5 text-sm transition-colors hover:border-(--color-accent) hover:text-(--color-accent) disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
