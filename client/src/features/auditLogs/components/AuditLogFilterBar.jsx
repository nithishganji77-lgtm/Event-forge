import { SearchInput } from '../../../components/ui/SearchInput.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { ACTION_LABELS } from '../../../utils/auditActionLabels.js';

// entityType stays a curated client-side list, not fetched from anywhere — the server filter is
// intentionally permissive (see server/src/validators/auditLog.validator.js), so this is a UX
// convenience, not a source of truth. Kept in sync by hand with the entityType strings controllers
// actually pass to writeAuditLog.
const ENTITY_TYPES = ['Organization', 'OrganizationMember', 'Invite', 'Event', 'EventRegistration', 'User'];

export function AuditLogFilterBar({
  search,
  onSearchChange,
  action,
  onActionChange,
  entityType,
  onEntityTypeChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <SearchInput value={search} onChange={onSearchChange} placeholder="Search by actor…" className="w-full sm:w-auto sm:max-w-xs" />
      <Select value={action} onChange={(e) => onActionChange(e.target.value)} className="w-full sm:w-auto sm:max-w-[14rem]">
        <option value="">All actions</option>
        {Object.entries(ACTION_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>
      <Select value={entityType} onChange={(e) => onEntityTypeChange(e.target.value)} className="w-full sm:w-auto sm:max-w-[12rem]">
        <option value="">All entity types</option>
        {ENTITY_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </Select>
      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="w-full sm:w-auto sm:max-w-[10rem]"
        aria-label="From date"
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        className="w-full sm:w-auto sm:max-w-[10rem]"
        aria-label="To date"
      />
    </div>
  );
}
