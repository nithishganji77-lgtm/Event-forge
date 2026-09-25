import { Mail } from 'lucide-react';
import { Avatar } from '../../../../components/ui/Avatar.jsx';
import { EmptyState } from '../../../../components/ui/EmptyState.jsx';

// There is no job title on a user, so the label is the role the person has on this event.
const ROLE_LABELS = { CREATOR: 'Creator', ORGANIZER: 'Organizer' };

export function EventOrganizersTab({ people = [] }) {
  if (people.length === 0) {
    return <EmptyState title="No organizers yet" description="Organizers you add to this event show up here." />;
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => (
        <li
          key={person._id}
          className="flex items-center gap-4 rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface) p-5"
        >
          <Avatar size="lg" name={person.name} src={person.avatar} />
          <div className="min-w-0">
            <p className="truncate font-medium">{person.name}</p>
            <p className="text-sm text-(--color-text)/60">{ROLE_LABELS[person.role] ?? 'Organizer'}</p>
            <a
              href={`mailto:${person.email}`}
              className="mt-1 inline-flex max-w-full items-center gap-1.5 text-sm text-(--color-text)/60 hover:text-(--color-text) hover:underline"
            >
              <Mail className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{person.email}</span>
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
