import { Link } from 'react-router-dom';
import { ChartColumn, ChevronRight, Rocket, UserPlus } from 'lucide-react';
import { useDashboardSummary } from '../hooks/useDashboardSummary.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
import { ROUTES } from '../../../utils/constants.js';

// Shortcuts to the three follow-ups a manager most often has, each shown only to someone who may
// actually do it (an organizer has no "Invite members"). Renders nothing if none apply.
export function QuickActions({ organizationId }) {
  const { organizationSlug, permissions } = useActiveOrganization();
  const { data: summary } = useDashboardSummary(organizationId);
  const drafts = summary?.pendingActions?.drafts ?? 0;

  const actions = [
    {
      key: 'publish',
      show: permissions.has(PERMISSIONS.EVENT_PUBLISH),
      icon: Rocket,
      label: 'Publish a draft',
      hint: drafts > 0 ? `${drafts} waiting` : undefined,
      to: `${ROUTES.orgEvents(organizationSlug)}?status=DRAFT`,
    },
    {
      key: 'invite',
      show: permissions.has(PERMISSIONS.MEMBER_CREATE),
      icon: UserPlus,
      label: 'Invite members',
      to: ROUTES.orgMembers(organizationSlug),
    },
    {
      key: 'analytics',
      show: permissions.has(PERMISSIONS.ANALYTICS_READ),
      icon: ChartColumn,
      label: 'View analytics',
      to: ROUTES.orgAnalytics(organizationSlug),
    },
  ].filter((action) => action.show);

  if (actions.length === 0) return null;

  return (
    <section aria-labelledby="quick-actions-heading">
      <h2 id="quick-actions-heading" className="text-meta mb-3 text-(--color-text)/50">
        Quick actions
      </h2>
      <ul className="divide-y divide-(--color-border) rounded-(--ef-radius) border border-(--color-border) bg-(--color-surface)">
        {actions.map(({ key, icon: Icon, label, hint, to }) => (
          <li key={key}>
            <Link
              to={to}
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors first:rounded-t-(--ef-radius) last:rounded-b-(--ef-radius) hover:bg-(--color-bg-secondary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--color-accent)"
            >
              <Icon className="size-4 shrink-0 text-(--color-text)/50" aria-hidden="true" />
              <span className="flex-1 font-medium">{label}</span>
              {hint && <span className="text-(--color-text)/50">{hint}</span>}
              <ChevronRight className="size-4 shrink-0 text-(--color-text)/30" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
