import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { GuestRoute } from './GuestRoute.jsx';
import { OrgLayoutRoute } from './OrgLayoutRoute.jsx';
import { RequireAccess } from '../components/RequireAccess.jsx';
import { RouteError } from '../components/RouteError.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ROUTES } from '../utils/constants.js';
import { PERMISSIONS } from '../utils/permissions.js';

// Every page below is a named export, so React.lazy's dynamic import() needs the .then() remap to
// a { default } shape. Splitting all 20 routes into their own chunks is what gets recharts (the
// heaviest single dependency, analytics-only) and framer-motion out of the main bundle for anyone
// who never visits those pages.
const LandingPage = lazy(() => import('../pages/LandingPage.jsx').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../pages/auth/LoginPage.jsx').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage.jsx').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() =>
  import('../pages/auth/ForgotPasswordPage.jsx').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('../pages/auth/ResetPasswordPage.jsx').then((m) => ({ default: m.ResetPasswordPage }))
);
const DashboardRedirect = lazy(() =>
  import('../pages/DashboardRedirect.jsx').then((m) => ({ default: m.DashboardRedirect }))
);
const OnboardingPage = lazy(() => import('../pages/OnboardingPage.jsx').then((m) => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('../pages/org/DashboardPage.jsx').then((m) => ({ default: m.DashboardPage })));
const MembersPage = lazy(() => import('../pages/org/MembersPage.jsx').then((m) => ({ default: m.MembersPage })));
const OrganizationSettingsPage = lazy(() =>
  import('../pages/org/OrganizationSettingsPage.jsx').then((m) => ({ default: m.OrganizationSettingsPage }))
);
const EventsListPage = lazy(() =>
  import('../pages/org/events/EventsListPage.jsx').then((m) => ({ default: m.EventsListPage }))
);
const CreateEventPage = lazy(() =>
  import('../pages/org/events/CreateEventPage.jsx').then((m) => ({ default: m.CreateEventPage }))
);
const EventDetailPage = lazy(() =>
  import('../pages/org/events/EventDetailPage.jsx').then((m) => ({ default: m.EventDetailPage }))
);
const EditEventPage = lazy(() =>
  import('../pages/org/events/EditEventPage.jsx').then((m) => ({ default: m.EditEventPage }))
);
const CalendarPage = lazy(() => import('../pages/org/CalendarPage.jsx').then((m) => ({ default: m.CalendarPage })));
const AnalyticsPage = lazy(() => import('../pages/org/AnalyticsPage.jsx').then((m) => ({ default: m.AnalyticsPage })));
const AuditLogPage = lazy(() => import('../pages/org/AuditLogPage.jsx').then((m) => ({ default: m.AuditLogPage })));
const NotificationsPage = lazy(() =>
  import('../pages/org/NotificationsPage.jsx').then((m) => ({ default: m.NotificationsPage }))
);
const InviteAcceptPage = lazy(() =>
  import('../pages/invites/InviteAcceptPage.jsx').then((m) => ({ default: m.InviteAcceptPage }))
);
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx').then((m) => ({ default: m.NotFoundPage })));

const router = createBrowserRouter([
  {
    // A pathless root so one errorElement covers every route below it.
    errorElement: <RouteError />,
    children: [
      {
        path: ROUTES.HOME,
        element: (
          <Suspense fallback={<Spinner />}>
            <LandingPage />
          </Suspense>
        ),
      },
      {
        element: <GuestRoute />,
        children: [
          { path: ROUTES.LOGIN, element: <LoginPage /> },
          { path: ROUTES.REGISTER, element: <RegisterPage /> },
          { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
          { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
        ],
      },
      // Must work whether or not the visitor is currently logged in — outside Guest/Protected.
      {
        path: ROUTES.INVITE_ACCEPT,
        element: (
          <Suspense fallback={<Spinner />}>
            <InviteAcceptPage />
          </Suspense>
        ),
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: ROUTES.DASHBOARD, element: <DashboardRedirect /> },
          { path: ROUTES.ONBOARDING, element: <OnboardingPage /> },
          {
            path: '/org/:orgSlug',
            element: <OrgLayoutRoute />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'members', element: <MembersPage /> },
              {
                path: 'settings',
                element: (
                  <RequireAccess permission={PERMISSIONS.ORGANIZATION_UPDATE}>
                    <OrganizationSettingsPage />
                  </RequireAccess>
                ),
              },
              { path: 'events', element: <EventsListPage /> },
              {
                path: 'events/new',
                element: (
                  <RequireAccess permission={PERMISSIONS.EVENT_CREATE}>
                    <CreateEventPage />
                  </RequireAccess>
                ),
              },
              { path: 'events/:eventId', element: <EventDetailPage /> },
              {
                path: 'events/:eventId/edit',
                element: (
                  <RequireAccess permission={PERMISSIONS.EVENT_UPDATE}>
                    <EditEventPage />
                  </RequireAccess>
                ),
              },
              { path: 'calendar', element: <CalendarPage /> },
              {
                path: 'analytics',
                element: (
                  <RequireAccess permission={PERMISSIONS.ANALYTICS_READ}>
                    <AnalyticsPage />
                  </RequireAccess>
                ),
              },
              {
                path: 'audit-logs',
                element: (
                  <RequireAccess permission={PERMISSIONS.AUDIT_READ}>
                    <AuditLogPage />
                  </RequireAccess>
                ),
              },
              { path: 'notifications', element: <NotificationsPage /> },
            ],
          },
        ],
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<Spinner />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
