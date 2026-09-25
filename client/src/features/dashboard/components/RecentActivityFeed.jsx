import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useRecentActivity } from '../hooks/useRecentActivity.js';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { describeActivity } from '../utils/describeActivity.js';
import { relativeTime } from '../../../utils/relativeTime.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { ROUTES } from '../../../utils/constants.js';

// Sentence-style rows — "Rahul registered for Sreeman Pelli" — built from the event title the audit
// row carries. Gated by AUDIT_READ at the call site: an organizer gets the schedule and quick
// actions instead.
export function RecentActivityFeed({ organizationId }) {
  const { organizationSlug } = useActiveOrganization();
  const { data, isLoading } = useRecentActivity(organizationId, 6);

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="text-meta mb-3 text-(--color-text)/50">
        Recent activity
      </h2>

      {isLoading && <Spinner />}

      {data && data.length === 0 && (
        <EmptyState compact icon={Activity} title="No activity yet" description="What happens across your organization will show up here." />
      )}

      {data && data.length > 0 && (
        <ul className="divide-y divide-(--color-border) rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface)">
          {data.map((log) => {
            const { actorName, verb, target, eventId } = describeActivity(log);
            return (
              <li key={log._id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <Avatar size="sm" name={log.actor?.name} src={log.actor?.avatar} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 leading-snug">
                    {actorName && <span className="font-medium">{actorName} </span>}
                    <span className="text-(--color-text)/70">{verb}</span>
                    {target &&
                      (eventId ? (
                        <>
                          {' '}
                          <Link
                            to={ROUTES.orgEventDetail(organizationSlug, eventId)}
                            className="font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
                          >
                            {target}
                          </Link>
                        </>
                      ) : (
                        <span className="font-medium"> {target}</span>
                      ))}
                  </p>
                  <p className="mt-0.5 text-xs text-(--color-text)/40">{relativeTime(log.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
