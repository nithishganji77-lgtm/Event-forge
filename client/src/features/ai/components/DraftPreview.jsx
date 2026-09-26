import { useState } from 'react';
import { CalendarClock, Check, ExternalLink, RefreshCw, Users } from 'lucide-react';
import { AiAgendaTimeline } from './AiAgendaTimeline.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { directionsUrl } from '../../events/utils/venueLinks.js';

const closes = (days) =>
  days === 0 ? 'Registration closes on the day' : `Registration closes ${days} ${days === 1 ? 'day' : 'days'} before`;

// The generated event, laid out like the event page. Everything here is text from the model that the
// server has already cleaned; React renders it as text and nothing on this screen is HTML.
//
// Venue ideas are selectable: the one picked travels with "Use this draft" and becomes the venue
// name; without `onUse` (an existing event is being edited, where a whole draft has nothing to
// replace) it is read-only. `replaceWarning` is set when using the draft would overwrite text the person already typed;
// the button then asks once, in place, instead of stacking a second dialog on this one.
export function DraftPreview({ draft, onUse, useLabel = 'Use this draft', replaceWarning = null, onRegenerate, regenerating = false }) {
  const [venue, setVenue] = useState(null);
  const [confirming, setConfirming] = useState(false);

  function use() {
    if (replaceWarning && !confirming) {
      setConfirming(true);
      return;
    }
    onUse(draft, { venue });
  }

  return (
    <article aria-label="Generated event draft" className="space-y-6 rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-5 sm:p-6">
      <header>
        <p className="text-meta text-(--color-accent)">{draft.category}</p>
        <h3 className="mt-1 text-2xl font-semibold leading-tight">{draft.title}</h3>
        {draft.tagline && <p className="mt-1 text-(--color-text)/70">{draft.tagline}</p>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-(--color-text)/70">
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden="true" />
            {draft.capacity} attendees
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden="true" />
            {closes(draft.registrationDeadlineDaysBefore)}
          </span>
        </div>
      </header>

      <section>
        <h4 className="text-meta mb-2 text-(--color-text)/60">Description</h4>
        <p className="whitespace-pre-line leading-relaxed text-(--color-text)/85">{draft.description}</p>
      </section>

      {draft.venueIdeas.length > 0 && (
        <section>
          <h4 className="text-meta mb-2 text-(--color-text)/60">Venue ideas</h4>
          <ul className="divide-y divide-(--color-border) rounded-(--ef-radius-sm) border border-(--color-border)">
            {draft.venueIdeas.map((idea) => {
              const selected = venue?.name === idea.name;
              return (
                <li key={`${idea.type}-${idea.name}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{idea.name}</p>
                    <p className="text-sm text-(--color-text)/60">
                      {idea.type}
                      {idea.seating && ` · ${idea.seating}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {idea.mapsQuery && (
                      <a
                        href={directionsUrl({ name: idea.mapsQuery })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-(--color-text)/70 underline-offset-4 hover:text-(--color-text) hover:underline"
                      >
                        Search on Maps
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                    {onUse && (
                      <Button
                        type="button"
                        size="sm"
                        variant={selected ? 'primary' : 'outline'}
                        aria-pressed={selected}
                        onClick={() => setVenue(selected ? null : idea)}
                      >
                        {selected && <Check className="size-4" aria-hidden="true" />}
                        {selected ? 'Selected as venue' : 'Use as venue'}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <h4 className="text-meta mb-3 text-(--color-text)/60">Agenda</h4>
        <AiAgendaTimeline agenda={draft.agenda} />
        {onUse && <p className="mt-3 text-xs text-(--color-text)/50">The agenda is added to the end of the description, where you can edit it.</p>}
      </section>

      <footer className="space-y-3 border-t border-(--color-border) pt-5">
        {confirming && (
          <p role="status" className="text-sm text-(--color-text)/80">
            {replaceWarning}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {onUse && (
            <Button type="button" variant="accent" onClick={use} autoFocus={confirming}>
              {confirming ? 'Replace and use this draft' : useLabel}
            </Button>
          )}
          {confirming && (
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Keep what I wrote
            </Button>
          )}
          {onRegenerate && !confirming && (
            <Button type="button" variant="outline" onClick={onRegenerate} loading={regenerating}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Another take
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
