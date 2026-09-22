import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

export function MostPopularEventsList({ mostPopularEvents }) {
  const { organizationSlug } = useActiveOrganization();

  if (!mostPopularEvents || mostPopularEvents.length === 0) {
    return <EmptyState title="No registrations yet" />;
  }

  return (
    <ol className="border border-(--color-border) divide-y divide-(--color-border)">
      {mostPopularEvents.map((p, index) => (
        <li key={p.event?._id || index} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="flex items-center gap-3">
            <span className="text-meta text-(--color-text)/40">{String(index + 1).padStart(2, '0')}</span>
            {p.event ? (
              <Link to={ROUTES.orgEventDetail(organizationSlug, p.event._id)} className="hover:text-(--color-accent)">
                {p.event.title}
              </Link>
            ) : (
              <span className="text-(--color-text)/40">Deleted event</span>
            )}
          </span>
          <span className="text-(--color-text)/60">{p.registeredCount} registered</span>
        </li>
      ))}
    </ol>
  );
}
