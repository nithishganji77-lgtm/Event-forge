import { useInvites, useResendInvite, useRevokeInvite } from '../hooks/useInvites.js';
import { InviteStatusBadge } from './InviteStatusBadge.jsx';
import { MemberRoleBadge } from '../../members/components/MemberRoleBadge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';

export function InvitesTable({ orgId }) {
  const { data, isLoading } = useInvites(orgId, { page: 1, limit: 20 });
  const resendInvite = useResendInvite(orgId);
  const revokeInvite = useRevokeInvite(orgId);

  if (isLoading) return <Spinner />;
  if (!data || data.data.length === 0) {
    return <EmptyState title="No pending invites" description="Invitations you send will show up here until accepted." />;
  }

  return (
    <div className="border border-(--color-border) overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-meta text-(--color-text)/50 border-b border-(--color-border)">
            <th className="text-left px-4 py-3 font-medium">Email</th>
            <th className="hidden sm:table-cell text-left px-4 py-3 font-medium">Role</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-right px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((invite) => (
            <tr key={invite._id} className="border-b border-(--color-border) last:border-0">
              <td className="px-4 py-3">{invite.email}</td>
              <td className="hidden sm:table-cell px-4 py-3"><MemberRoleBadge role={invite.role} /></td>
              <td className="px-4 py-3">
                <InviteStatusBadge status={invite.status} isExpired={invite.isExpired} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  {invite.status === 'PENDING' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={resendInvite.isPending}
                        onClick={() => resendInvite.mutate(invite._id)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={revokeInvite.isPending}
                        onClick={() => revokeInvite.mutate(invite._id)}
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
