import { useParams } from 'react-router-dom';
import { useEvent } from '../../../features/events/hooks/useEvent.js';
import { EventWizard } from '../../../features/events/components/EventWizard/EventWizard.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { extractErrorMessage } from '../../../lib/axios.js';

export function EditEventPage() {
  const { eventId } = useParams();
  const { data: event, isLoading, isError, error } = useEvent(eventId);

  if (isLoading) return <Spinner />;
  if (isError) return <Alert tone="error">{extractErrorMessage(error, 'Could not load event')}</Alert>;

  return (
    <div>
      <p className="text-meta text-(--color-text)/50 mb-2">EDIT EVENT</p>
      <h1 className="text-2xl font-semibold mb-8">{event.title}</h1>
      <EventWizard mode="edit" event={event} />
    </div>
  );
}
