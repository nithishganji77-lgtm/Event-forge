import { EventWizard } from '../../../features/events/components/EventWizard/EventWizard.jsx';

export function CreateEventPage() {
  return (
    <div>
      <p className="text-meta text-(--color-text)/50 mb-2">CREATE EVENT</p>
      <h1 className="text-2xl font-semibold mb-8">Build your event</h1>
      <EventWizard mode="create" />
    </div>
  );
}
