import { Badge } from '../../../components/ui/Badge.jsx';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Org Admin',
  ORGANIZER: 'Organizer',
  EMPLOYEE: 'Employee',
};

export function MemberRoleBadge({ role }) {
  return <Badge tone={role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' ? 'accent' : 'neutral'}>{ROLE_LABELS[role] || role}</Badge>;
}

export { ROLE_LABELS };
