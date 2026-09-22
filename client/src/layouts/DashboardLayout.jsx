import { Suspense, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, LogOut } from 'lucide-react';
import { Logo } from '../components/Logo.jsx';
import { OrgSwitcher } from '../features/organizations/components/OrgSwitcher.jsx';
import { NotificationBell } from '../features/notifications/components/NotificationBell.jsx';
import { SidebarNav } from './SidebarNav.jsx';
import { MobileNavDrawer } from './MobileNavDrawer.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useActiveOrganization } from '../hooks/useActiveOrganization.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLogout } from '../features/auth/hooks/useLogout.js';
import { ROUTES } from '../utils/constants.js';

export function DashboardLayout() {
  const { organizationSlug } = useActiveOrganization();
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr] bg-(--color-bg) text-(--color-text)">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-(--color-accent) focus:text-(--color-accent-foreground) focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <aside className="hidden lg:flex flex-col border-r border-(--color-border) py-6">
        <div className="px-4 mb-8">
          <Logo />
        </div>
        <SidebarNav organizationSlug={organizationSlug} />
      </aside>

      <MobileNavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} organizationSlug={organizationSlug} />

      <div className="flex flex-col min-w-0">
        <header className="flex items-center justify-between border-b border-(--color-border) px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-nav-drawer"
              className="lg:hidden text-(--color-text)/60 hover:text-(--color-text) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <OrgSwitcher />
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-sm text-(--color-text)/70 hidden sm:inline">{user?.name}</span>
            <button
              onClick={() => logout.mutate(undefined, { onSuccess: () => navigate(ROUTES.LOGIN) })}
              aria-label="Log out"
              className="text-(--color-text)/60 hover:text-(--color-accent) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
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
