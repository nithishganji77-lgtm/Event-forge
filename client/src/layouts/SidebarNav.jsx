import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, CalendarRange, ChartColumn, Users, Settings, ScrollText } from 'lucide-react';
import { useActiveOrganization } from '../hooks/useActiveOrganization.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { ROUTES } from '../utils/constants.js';
import { cn } from '../lib/cn.js';

// Members = the organization's people (accounts); it is not an "attendees" page — attendees live
// on each event, so the label stays "Members".
export const NAV_GROUPS = [
  {
    key: 'workspace',
    label: 'Workspace',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.orgDashboard },
      { key: 'events', label: 'Events', icon: CalendarDays, to: ROUTES.orgEvents, permission: PERMISSIONS.EVENT_READ },
      { key: 'calendar', label: 'Calendar', icon: CalendarRange, to: ROUTES.orgCalendar, permission: PERMISSIONS.EVENT_READ },
      { key: 'members', label: 'Members', icon: Users, to: ROUTES.orgMembers },
      { key: 'analytics', label: 'Analytics', icon: ChartColumn, to: ROUTES.orgAnalytics, permission: PERMISSIONS.ANALYTICS_READ },
    ],
  },
  {
    key: 'management',
    label: 'Management',
    items: [
      { key: 'audit', label: 'Audit Log', icon: ScrollText, to: ROUTES.orgAuditLogs, permission: PERMISSIONS.AUDIT_READ },
      { key: 'settings', label: 'Settings', icon: Settings, to: ROUTES.orgSettings, permission: PERMISSIONS.ORGANIZATION_UPDATE },
    ],
  },
];

function NavItem({ to, icon: Icon, label, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      // Icon-only rail: the visible text is gone, so the name must come from aria-label/title.
      {...(collapsed ? { 'aria-label': label, title: label } : {})}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 mx-2 py-2 text-sm rounded-(--ef-radius-sm) transition-colors',
          collapsed ? 'justify-center px-0' : 'px-3',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
          // The active accent bar is a pseudo-element rather than a border so it stays a straight
          // bar next to the rounded item.
          isActive
            ? 'bg-(--color-surface) text-(--color-text) before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:rounded-full before:bg-(--color-accent)'
            : 'text-(--color-text)/60 hover:text-(--color-text) hover:bg-(--color-surface)/60'
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed && label}
    </NavLink>
  );
}

// Single source of truth for the RBAC-gated nav — rendered by both DashboardLayout's desktop
// <aside> and MobileNavDrawer, so permission logic never drifts between them. Items are filtered
// by the caller's effective permissions here (rather than wrapping each in RequirePermission) so a
// group with nothing left, e.g. Management for an employee, drops its heading too. `collapsed` is
// the desktop icon rail; the drawer never passes it.
export function SidebarNav({ organizationSlug, ariaLabel = 'Main navigation', onNavigate, collapsed = false }) {
  const { permissions } = useActiveOrganization();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || permissions.has(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label={ariaLabel} className="flex-1">
      {groups.map((group, index) => (
        <div key={group.key} className={index > 0 ? 'mt-5' : undefined}>
          {collapsed ? (
            index > 0 && <div role="separator" className="mx-4 mb-2 h-px bg-(--color-border)" />
          ) : (
            <p className="text-meta px-5 mb-1.5 text-(--color-text)/40">{group.label}</p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavItem
                key={item.key}
                to={item.to(organizationSlug)}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
