import { SearchInput } from '../../../components/ui/SearchInput.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { EVENT_CATEGORIES } from '../schemas/event.schema.js';

const STATUS_OPTIONS = [
  ['', 'All statuses'],
  ['DRAFT', 'Draft'],
  ['REGISTRATION_OPEN', 'Registration Open'],
  ['REGISTRATION_CLOSED', 'Registration Closed'],
  ['ONGOING', 'Ongoing'],
  ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'],
];

// Search/category/status only this phase — organizer and date-range filters are already
// supported server-side but left out of the UI here to keep the bar simple; nothing architectural
// blocks adding them later.
export function EventsFilterBar({ search, onSearchChange, category, onCategoryChange, status, onStatusChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      <SearchInput value={search} onChange={onSearchChange} placeholder="Search events…" className="w-full sm:w-auto sm:max-w-xs" />
      <Select value={category} onChange={(e) => onCategoryChange(e.target.value)} className="w-full sm:w-auto sm:max-w-[10rem]">
        <option value="">All categories</option>
        {EVENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </Select>
      <Select value={status} onChange={(e) => onStatusChange(e.target.value)} className="w-full sm:w-auto sm:max-w-[12rem]">
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>
    </div>
  );
}
