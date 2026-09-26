import { useState } from 'react';
import { AiField } from './AiField.jsx';
import { VenueCards } from './VenueCards.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Textarea } from '../../../components/ui/Textarea.jsx';
import { useSuggestVenues } from '../hooks/useAi.js';
import { describeAiError } from '../utils/aiErrors.js';

const FIELDS = ['theme', 'capacity', 'city'];

export function VenuesTab({ orgId, onUseVenue }) {
  const [theme, setTheme] = useState('');
  const [capacity, setCapacity] = useState('');
  const [city, setCity] = useState('');
  const venues = useSuggestVenues(orgId);
  const { fieldErrors, banner } = describeAiError(venues.error, FIELDS);
  const ready = theme.trim() && Number(capacity) >= 1;

  function search({ fresh = false } = {}) {
    if (!ready || venues.isPending) return;
    venues.mutate({ theme, capacity: Number(capacity), ...(city.trim() && { city }), ...(fresh && { fresh: true }) });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        search();
      }}
    >
      <AiField id="forge-venue-theme" label="What is the event?" hint="e.g. a leadership offsite with workshops and a dinner" error={fieldErrors.theme}>
        <Textarea id="forge-venue-theme" rows={2} value={theme} onChange={(e) => setTheme(e.target.value)} />
      </AiField>
      <div className="grid gap-4 sm:grid-cols-2">
        <AiField id="forge-venue-capacity" label="How many people?" error={fieldErrors.capacity}>
          <Input id="forge-venue-capacity" type="number" min="1" max="5000" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </AiField>
        <AiField id="forge-venue-city" label="City or region (optional)" error={fieldErrors.city}>
          <Input id="forge-venue-city" value={city} maxLength={60} placeholder="e.g. Pune" onChange={(e) => setCity(e.target.value)} />
        </AiField>
      </div>
      <Button type="submit" variant="accent" loading={venues.isPending} disabled={!ready && !venues.isPending}>
        Find venues
      </Button>

      <div aria-live="polite">
        {banner && <Alert tone="error">{banner}</Alert>}
        {venues.isPending && <p role="status" className="text-sm text-(--color-text)/60">Looking for venue types that fit…</p>}
        {venues.data && !venues.isPending && (
          <div className="space-y-4">
            <VenueCards venues={venues.data.result.venues} onUseVenue={onUseVenue} />
            <Button type="button" variant="outline" size="sm" onClick={() => search({ fresh: true })}>
              Show different venues
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
