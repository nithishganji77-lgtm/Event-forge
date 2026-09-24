import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '../components/ui/DropdownMenu.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { ROLE_LABELS } from '../features/members/components/MemberRoleBadge.jsx';
import { useLogout } from '../features/auth/hooks/useLogout.js';
import { useAuth } from '../hooks/useAuth.js';
import { useActiveOrganization } from '../hooks/useActiveOrganization.js';
import { useThemePreference } from '../hooks/useTheme.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { ROUTES } from '../utils/constants.js';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

// Only links to pages that exist: there is no profile, preferences or help page, so the menu has
// none of those entries rather than dead ones.
export function UserMenu() {
  const { user } = useAuth();
  const { role, organizationSlug, permissions } = useActiveOrganization();
  const logout = useLogout();
  const navigate = useNavigate();
  const [themePreference, setThemePreference] = useThemePreference();

  return (
    <DropdownMenu
      label="Account menu"
      trigger={({ triggerProps }) => (
        <button
          {...triggerProps}
          aria-label={`Account menu for ${user?.name ?? 'you'}`}
          className="flex items-center gap-2.5 rounded-(--ef-radius-sm) py-1 pl-1 pr-2 transition-colors hover:bg-(--color-bg-secondary) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
        >
          <Avatar name={user?.name} src={user?.avatar} />
          <span className="hidden sm:block text-left leading-tight">
            <span className="block max-w-32 truncate text-sm font-medium">{user?.name}</span>
            <span className="block text-xs text-(--color-text)/50">{ROLE_LABELS[role] ?? ''}</span>
          </span>
          <ChevronDown className="hidden sm:block size-3.5 text-(--color-text)/40" aria-hidden="true" />
        </button>
      )}
    >
      <div className="px-3 py-2">
        <p className="truncate text-sm font-medium">{user?.name}</p>
        <p className="truncate text-xs text-(--color-text)/50">{user?.email}</p>
      </div>
      <DropdownMenuSeparator />

      {permissions.has(PERMISSIONS.ORGANIZATION_UPDATE) && (
        <DropdownMenuItem as={Link} to={ROUTES.orgSettings(organizationSlug)} icon={Settings}>
          Organization settings
        </DropdownMenuItem>
      )}
      <DropdownMenuItem as={Link} to={ROUTES.orgNotifications(organizationSlug)} icon={Bell}>
        Notifications
      </DropdownMenuItem>
      <DropdownMenuSeparator />

      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuRadioItem
          key={value}
          checked={themePreference === value}
          onSelect={() => setThemePreference(value)}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </DropdownMenuRadioItem>
      ))}
      <DropdownMenuSeparator />

      <DropdownMenuItem
        icon={LogOut}
        onSelect={() => logout.mutate(undefined, { onSuccess: () => navigate(ROUTES.LOGIN) })}
      >
        Sign out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
