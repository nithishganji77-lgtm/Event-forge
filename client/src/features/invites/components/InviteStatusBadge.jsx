import { Badge } from '../../../components/ui/Badge.jsx';

export function InviteStatusBadge({ status, isExpired }) {
  if (status === 'PENDING' && isExpired) return <Badge tone="accent">Expired</Badge>;
  if (status === 'PENDING') return <Badge tone="neutral">Pending</Badge>;
  if (status === 'ACCEPTED') return <Badge tone="neutral">Accepted</Badge>;
  return <Badge tone="accent">Revoked</Badge>;
}
