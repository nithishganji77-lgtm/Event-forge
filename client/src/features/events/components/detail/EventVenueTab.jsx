import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { Panel } from './Panel.jsx';
import { Button } from '../../../../components/ui/Button.jsx';
import { EmptyState } from '../../../../components/ui/EmptyState.jsx';
import { directionsUrl, safeHttpUrl } from '../../utils/venueLinks.js';
import { useActiveOrganization } from '../../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../../utils/constants.js';

// Not a map: there is no map provider behind this app, and a picture of one would be a fake.
// "Get directions" opens a Google Maps search for the venue, which works for any address.
export function EventVenueTab({ event, canManage }) {
  const { organizationSlug } = useActiveOrganization();
  const venue = event.venue ?? {};
  const directions = directionsUrl(venue);
  const mapLink = safeHttpUrl(venue.mapUrl);

  if (!venue.name && !venue.address) {
    return (
      <EmptyState
        icon={MapPin}
        title="No venue yet"
        description="This event doesn't have a location."
        action={
          canManage ? (
            <Button as={Link} to={ROUTES.orgEventEdit(organizationSlug, event._id)} variant="outline">
              Add a venue
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <Panel title="Venue">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col justify-center">
          <p className="text-2xl font-semibold leading-tight">{venue.name || venue.address}</p>
          {venue.name && venue.address && <p className="mt-2 text-(--color-text)/70">{venue.address}</p>}
          {venue.room && <p className="mt-1 text-sm text-(--color-text)/50">Room: {venue.room}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {directions && (
              <Button as="a" href={directions} target="_blank" rel="noopener noreferrer">
                <Navigation className="size-4" aria-hidden="true" />
                Get directions
              </Button>
            )}
            {mapLink && (
              <Button as="a" href={mapLink} target="_blank" rel="noopener noreferrer" variant="outline">
                <ExternalLink className="size-4" aria-hidden="true" />
                Open map link
              </Button>
            )}
          </div>
        </div>

        {/* Decorative only: a dotted plane with a pin, so the tab has a visual anchor. */}
        <div
          aria-hidden="true"
          className="relative grid min-h-48 place-items-center overflow-hidden rounded-(--ef-radius-sm) border border-(--color-border) bg-(--color-bg-secondary)"
          style={{ backgroundImage: 'radial-gradient(var(--color-border) 1.2px, transparent 1.2px)', backgroundSize: '20px 20px' }}
        >
          <span className="grid size-14 place-items-center rounded-full bg-(--color-accent) text-(--color-accent-foreground) ring-8 ring-(--color-accent)/20">
            <MapPin className="size-6" />
          </span>
        </div>
      </div>
    </Panel>
  );
}
