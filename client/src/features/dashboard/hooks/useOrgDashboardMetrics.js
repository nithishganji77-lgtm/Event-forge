import { useQuery } from '@tanstack/react-query';
import { fetchMembers } from '../../../services/member.service.js';
import { fetchEvents } from '../../../services/event.service.js';
import { useOrgAnalytics } from '../../analytics/hooks/useOrgAnalytics.js';

// Composes 3 existing/adjacent endpoints rather than inventing a bespoke aggregate-metrics
// endpoint that would just re-implement pieces of listMembers/listEvents/getOrgAnalytics under a
// new name. limit:1 on the count-only queries keeps the payload tiny — only pagination.total is read.
export function useOrgDashboardMetrics(orgId) {
  const membersQuery = useQuery({
    queryKey: ['organizations', orgId, 'members', { status: 'ACTIVE', limit: 1 }],
    queryFn: () => fetchMembers(orgId, { status: 'ACTIVE', limit: 1 }),
    enabled: Boolean(orgId),
  });
  const upcomingEventsQuery = useQuery({
    queryKey: ['organizations', orgId, 'events', { status: 'REGISTRATION_OPEN', limit: 1 }],
    queryFn: () => fetchEvents(orgId, { status: 'REGISTRATION_OPEN', limit: 1 }),
    enabled: Boolean(orgId),
  });
  const analyticsQuery = useOrgAnalytics(orgId);

  return {
    isLoading: membersQuery.isLoading || upcomingEventsQuery.isLoading || analyticsQuery.isLoading,
    isError: membersQuery.isError || upcomingEventsQuery.isError || analyticsQuery.isError,
    totalMembers: membersQuery.data?.pagination?.total,
    upcomingEventsCount: upcomingEventsQuery.data?.pagination?.total,
    totalRegistrations: analyticsQuery.data?.totalRegistrations,
    attendanceRate: analyticsQuery.data?.attendanceRate,
  };
}
