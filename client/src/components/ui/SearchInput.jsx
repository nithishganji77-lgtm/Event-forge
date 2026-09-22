import { Search } from 'lucide-react';
import { Input } from './Input.jsx';

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={`relative ${className || ''}`}>
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-(--color-text)/40"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
