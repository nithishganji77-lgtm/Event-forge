import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, CalendarRange, ChartColumn, Users, Settings, ScrollText } from 'lucide-react';
import { RequirePermission } from '../components/RequirePermission.jsx';
import { PERMISSIONS } from '../utils/permissions.js';
import { ROUTES } from '../utils/constants.js';
import { cn } from '../lib/cn.js';

function NavItem({ to, icon: Icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-2.5 text-sm border-l-2 transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
          isActive
            ? 'border-(--color-accent) text-(--color-text) bg-(--color-bg-secondary)'
            : 'border-transparent text-(--color-text)/60 hover:text-(--color-text)'
        )
      }
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </NavLink>
  );
}

// Single source of truth for the RBAC-gated nav list — rendered by both DashboardLayout's desktop
// <aside> and MobileNavDrawer, so permission logic never drifts between the two. onNavigate lets
// the drawer close itself when a link is clicked (the desktop <aside> passes nothing).
export function SidebarNav({ organizationSlug, ariaLabel = 'Main navigation', onNavigate }) {
  return (
    <nav aria-label={ariaLabel} className="flex-1 space-y-1">
      <NavItem to={ROUTES.orgDashboard(organizationSlug)} icon={LayoutDashboard} onClick={onNavigate}>
        Dashboard
      </NavItem>
      <RequirePermission permission={PERMISSIONS.EVENT_READ}>
        <NavItem to={ROUTES.orgEvents(organizationSlug)} icon={CalendarDays} onClick={onNavigate}>
          Events
        </NavItem>
      </RequirePermission>
      <RequirePermission permission={PERMISSIONS.EVENT_READ}>
        <NavItem to={ROUTES.orgCalendar(organizationSlug)} icon={CalendarRange} onClick={onNavigate}>
          Calendar
        </NavItem>
      </RequirePermission>
      <NavItem to={ROUTES.orgMembers(organizationSlug)} icon={Users} onClick={onNavigate}>
        Members
      </NavItem>
      <RequirePermission permission={PERMISSIONS.ANALYTICS_READ}>
        <NavItem to={ROUTES.orgAnalytics(organizationSlug)} icon={ChartColumn} onClick={onNavigate}>
          Analytics
        </NavItem>
      </RequirePermission>
      <RequirePermission permission={PERMISSIONS.AUDIT_READ}>
        <NavItem to={ROUTES.orgAuditLogs(organizationSlug)} icon={ScrollText} onClick={onNavigate}>
          Audit Log
        </NavItem>
      </RequirePermission>
      <RequirePermission permission={PERMISSIONS.ORGANIZATION_UPDATE}>
        <NavItem to={ROUTES.orgSettings(organizationSlug)} icon={Settings} onClick={onNavigate}>
          Settings
        </NavItem>
      </RequirePermission>
    </nav>
  );
}
