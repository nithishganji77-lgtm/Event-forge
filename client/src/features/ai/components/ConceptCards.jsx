import { Button } from '../../../components/ui/Button.jsx';

export function ConceptCards({ concepts, onPlan }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {concepts.map((concept, index) => (
        <li key={`${concept.title}-${index}`} className="flex flex-col rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-5">
          <p className="text-meta text-(--color-accent)">{concept.category}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">{concept.title}</h3>
          {concept.tagline && <p className="mt-1 text-sm text-(--color-text)/70">{concept.tagline}</p>}
          <p className="mt-3 text-sm leading-relaxed text-(--color-text)/80">{concept.why}</p>
          {concept.highlights.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-(--color-text)/70">
              {concept.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          )}
          {concept.budgetNote && <p className="mt-3 text-sm text-(--color-text)/60">{concept.budgetNote}</p>}
          <div className="mt-auto pt-4">
            <Button type="button" size="sm" variant="outline" onClick={() => onPlan(concept)}>
              Plan this concept
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
