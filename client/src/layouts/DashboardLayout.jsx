import { Suspense, useLayoutEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '../components/Logo.jsx';
import { OrgSwitcher } from '../features/organizations/components/OrgSwitcher.jsx';
import { NotificationBell } from '../features/notifications/components/NotificationBell.jsx';
import { SidebarNav } from './SidebarNav.jsx';
import { MobileNavDrawer } from './MobileNavDrawer.jsx';
import { UserMenu } from './UserMenu.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useActiveOrganization } from '../hooks/useActiveOrganization.js';
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed.js';
import { cn } from '../lib/cn.js';

export function DashboardLayout() {
  const { organizationSlug } = useActiveOrganization();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  // Opts the whole logged-in app into the rounded look (see --ef-radius in globals.css). Set on
  // <html>, not this layout's own element, so portalled UI (Modal, the mobile drawer) inherits it;
  // a layout effect so the first paint is already rounded.
  useLayoutEffect(() => {
    document.documentElement.dataset.shell = 'app';
    return () => {
      delete document.documentElement.dataset.shell;
    };
  }, []);

  return (
    <div
      className={cn(
        'min-h-screen grid grid-cols-1 bg-(--color-bg) text-(--color-text)',
        'lg:transition-[grid-template-columns] lg:duration-200',
        collapsed ? 'lg:grid-cols-[72px_1fr]' : 'lg:grid-cols-[248px_1fr]'
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-(--color-accent) focus:text-(--color-accent-foreground) focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      {/* No overflow on the sidebar: the workspace switcher's dropdown opens inside it and would be
          clipped. Seven nav items always fit, so it never needs to scroll. */}
      <aside className="hidden lg:flex flex-col sticky top-0 h-screen bg-(--color-sidebar) border-r border-(--color-border) py-4">
        <div className={cn('mb-5', collapsed ? 'flex justify-center' : 'px-5')}>
          <Logo iconOnly={collapsed} />
        </div>
        <div className={cn('mb-5', collapsed ? 'px-2' : 'px-3')}>
          <OrgSwitcher collapsed={collapsed} />
        </div>
        <SidebarNav organizationSlug={organizationSlug} collapsed={collapsed} />
        <div className={cn('mt-3 pt-3 border-t border-(--color-border)', collapsed ? 'px-2' : 'px-3')}>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-3 rounded-(--ef-radius-sm) px-3 py-2 text-sm text-(--color-text)/60 transition-colors',
              'hover:bg-(--color-surface)/60 hover:text-(--color-text)',
              collapsed && 'justify-center px-0',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)'
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose className="size-4" aria-hidden="true" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} organizationSlug={organizationSlug} />

      <div className="flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-(--color-border) bg-(--color-bg)/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              className="text-(--color-text)/60 hover:text-(--color-text) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <Logo />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-8">
          <Suspense fallback={<Spinner />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.15 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
