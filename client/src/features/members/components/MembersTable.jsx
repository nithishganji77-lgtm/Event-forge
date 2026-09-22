import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useMembers } from '../hooks/useMembers.js';
import { useUpdateMemberRole, useUpdateMemberStatus } from '../hooks/useUpdateMember.js';
import { MemberRoleBadge, ROLE_LABELS } from './MemberRoleBadge.jsx';
import { RemoveMemberDialog } from './RemoveMemberDialog.jsx';
import { SearchInput } from '../../../components/ui/SearchInput.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Pagination } from '../../../components/ui/Pagination.jsx';
import { EmptyState } from '../../../components/ui/EmptyState.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Alert } from '../../../components/ui/Alert.jsx';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js';
import { useActiveOrganization } from '../../../hooks/useActiveOrganization.js';
import { PERMISSIONS } from '../../../utils/permissions.js';
import { extractErrorMessage } from '../../../lib/axios.js';

export function MembersTable() {
  const { organizationId, permissions } = useActiveOrganization();
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [removeTarget, setRemoveTarget] = useState(null);

  const search = useDebouncedValue(searchInput);
  const filters = { page, limit: 20, search: search || undefined, role: role || undefined, status: status || undefined };

  const { data, isLoading, isError, error } = useMembers(organizationId, filters);
  const updateRole = useUpdateMemberRole(organizationId);
  const updateStatus = useUpdateMemberStatus(organizationId);

  const canManage = permissions.has(PERMISSIONS.MEMBER_UPDATE);
  const canRemove = permissions.has(PERMISSIONS.MEMBER_DELETE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={searchInput}
          onChange={(v) => {
            setSearchInput(v);
            setPage(1);
          }}
          placeholder="Search members…"
          className="w-full sm:w-auto sm:max-w-xs"
        />
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-full sm:w-auto sm:max-w-[10rem]">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full sm:w-auto sm:max-w-[10rem]">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </Select>
      </div>

      {isError && <Alert tone="error">{extractErrorMessage(error, 'Could not load members')}</Alert>}
      {isLoading && <Spinner />}

      {data && data.data.length === 0 && (
        <EmptyState title="No members found" description="Try a different search or filter." />
      )}

      {data && data.data.length > 0 && (
        <div className="border border-(--color-border) overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-meta text-(--color-text)/50 border-b border-(--color-border)">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="hidden md:table-cell text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="hidden lg:table-cell text-left px-4 py-3 font-medium">Joined</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((member) => (
                <tr key={member._id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-4 py-3">{member.user?.name}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-(--color-text)/70">{member.user?.email}</td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <Select
                        value={member.role}
                        onChange={(e) => updateRole.mutate({ memberId: member._id, role: e.target.value })}
                        className="max-w-[11rem] py-1.5"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </Select>
                    ) : (
                      <MemberRoleBadge role={member.role} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={member.status === 'ACTIVE' ? 'neutral' : 'accent'}>
                      {member.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-(--color-text)/70">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              memberId: member._id,
                              status: member.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
                            })
                          }
                        >
                          {member.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${member.user?.name}`}
                          onClick={() => setRemoveTarget(member)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} onPageChange={setPage} />
      )}

      {removeTarget && (
        <RemoveMemberDialog
          orgId={organizationId}
          member={removeTarget}
          open={Boolean(removeTarget)}
          onClose={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
