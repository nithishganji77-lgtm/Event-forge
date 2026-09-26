import { useParams } from 'react-router-dom';
import { useEvent } from '../../../features/events/hooks/useEvent.js';
import { EventWizard } from '../../../features/events/components/EventWizard/EventWizard.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { QueryError } from '../../../components/ui/QueryError.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

export function EditEventPage() {
  const { eventId } = useParams();
  const { organizationSlug } = useActiveOrganization();
  const { data: event, isLoading, isError, error, refetch, isFetching } = useEvent(eventId);

  if (isLoading) return <Spinner />;
  if (isError) {
    return (
      <QueryError
        error={error}
        title="We couldn't open this event to edit it"
        onRetry={refetch}
        isRetrying={isFetching}
        backTo={{ to: ROUTES.orgEvents(organizationSlug), label: 'Back to events' }}
      />
    );
  }

  return (
    <div>
      <p className="text-meta text-(--color-text)/50 mb-2">EDIT EVENT</p>
      <h1 className="text-2xl font-semibold mb-8">{event.title}</h1>
      <EventWizard mode="edit" event={event} />
    </div>
  );
}
