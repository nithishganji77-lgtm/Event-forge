import { ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button.jsx';
import { directionsUrl } from '../../events/utils/venueLinks.js';

// Venue TYPES with a Maps search, not real businesses: the model is told never to invent those, so
// the search link is how a person turns an idea into an actual place.
export function VenueCards({ venues, onUseVenue }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {venues.map((venue, index) => (
        <li key={`${venue.name}-${index}`} className="flex flex-col rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-5">
          <p className="text-meta text-(--color-text)/60">{venue.type}</p>
          <h3 className="mt-1 text-lg font-semibold leading-snug">{venue.name}</h3>
          <dl className="mt-3 space-y-1.5 text-sm">
            {venue.seating && (
              <div>
                <dt className="inline text-(--color-text)/50">Seating: </dt>
                <dd className="inline">{venue.seating}</dd>
              </div>
            )}
            {venue.capacityFit && (
              <div>
                <dt className="inline text-(--color-text)/50">Fit: </dt>
                <dd className="inline">{venue.capacityFit}</dd>
              </div>
            )}
          </dl>
          {venue.notes && <p className="mt-2 text-sm text-(--color-text)/70">{venue.notes}</p>}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
            {venue.mapsQuery && (
              <a
                href={directionsUrl({ name: venue.mapsQuery })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-(--color-text)/70 underline-offset-4 hover:text-(--color-text) hover:underline"
              >
                Search on Maps
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
            {onUseVenue && (
              <Button type="button" size="sm" variant="outline" onClick={() => onUseVenue(venue)}>
                Use as venue
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
