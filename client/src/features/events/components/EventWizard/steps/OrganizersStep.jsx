import { useFormContext, Controller } from 'react-hook-form';
import { useMembers } from '../../../../members/hooks/useMembers.js';
import { Spinner } from '../../../../../components/ui/Spinner.jsx';

export function OrganizersStep({ organizationId }) {
  const { control } = useFormContext();
  const { data, isLoading } = useMembers(organizationId, { page: 1, limit: 100, status: 'ACTIVE' });

  if (isLoading) return <Spinner />;

  return (
    <div className="max-w-xl">
      <p className="text-meta text-(--color-text)/50 mb-4">Select members</p>
      <Controller
        name="organizers"
        control={control}
        render={({ field }) => (
          <div className="border border-(--color-border) divide-y divide-(--color-border)">
            {data?.data.map((member) => {
              const userId = member.user._id;
              const checked = field.value?.includes(userId);
              return (
                <label key={userId} className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...(field.value || []), userId]
                        : (field.value || []).filter((id) => id !== userId);
                      field.onChange(next);
                    }}
                  />
                  <span>{member.user.name}</span>
                  <span className="text-(--color-text)/50">{member.user.email}</span>
                </label>
              );
            })}
            {data?.data.length === 0 && (
              <p className="px-4 py-3 text-sm text-(--color-text)/50">No members to assign yet.</p>
            )}
          </div>
        )}
      />
    </div>
  );
}
