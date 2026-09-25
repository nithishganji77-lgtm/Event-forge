import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAtOrgRoute } from '../../tests/test-utils.jsx';
import { RequireAccess } from './RequireAccess.jsx';
import { PERMISSIONS } from '../utils/permissions.js';

const membership = (role) => ({
  organizationId: 'org-1',
  organizationSlug: 'acme',
  organizationName: 'Acme',
  role,
  permissions: [],
});

const render = (role, permission) =>
  renderAtOrgRoute(
    <RequireAccess permission={permission}>
      <p>The page</p>
    </RequireAccess>,
    { orgSlug: 'acme', memberships: [membership(role)] }
  );

describe('RequireAccess', () => {
  it('shows the page to a role that holds the permission', () => {
    render('SUPER_ADMIN', PERMISSIONS.ANALYTICS_READ);
    expect(screen.getByText('The page')).toBeInTheDocument();
  });

  it('shows an explanation and a way back to a role that does not, instead of the page', () => {
    render('EMPLOYEE', PERMISSIONS.ANALYTICS_READ);
    expect(screen.queryByText('The page')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: "You don't have access to this page" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/org/acme/dashboard');
  });

  it.each([
    ['ORGANIZER', PERMISSIONS.AUDIT_READ, false],
    ['ORGANIZER', PERMISSIONS.ORGANIZATION_UPDATE, false],
    ['ORGANIZER', PERMISSIONS.EVENT_CREATE, true],
    ['EMPLOYEE', PERMISSIONS.EVENT_CREATE, false],
    ['ORG_ADMIN', PERMISSIONS.ORGANIZATION_UPDATE, true],
  ])('%s + %s -> page shown: %s', (role, permission, shown) => {
    render(role, permission);
    expect(Boolean(screen.queryByText('The page'))).toBe(shown);
  });
});
