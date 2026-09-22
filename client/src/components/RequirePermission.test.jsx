import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAtOrgRoute } from '../../tests/test-utils.jsx';
import { RequirePermission } from './RequirePermission.jsx';
import { PERMISSIONS } from '../utils/permissions.js';

const membership = {
  organizationId: 'org-1',
  organizationSlug: 'acme',
  organizationName: 'Acme Corp',
  role: 'EMPLOYEE',
  permissions: [],
};

describe('RequirePermission', () => {
  it('renders children when the active membership has the permission', () => {
    renderAtOrgRoute(
      <RequirePermission permission={PERMISSIONS.EVENT_READ}>
        <span>Visible</span>
      </RequirePermission>,
      { orgSlug: 'acme', memberships: [membership] }
    );
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('renders the fallback (default: nothing) when the permission is absent', () => {
    renderAtOrgRoute(
      <RequirePermission permission={PERMISSIONS.ORGANIZATION_DELETE}>
        <span>Hidden</span>
      </RequirePermission>,
      { orgSlug: 'acme', memberships: [membership] }
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders a custom fallback when provided and the permission is absent', () => {
    renderAtOrgRoute(
      <RequirePermission permission={PERMISSIONS.ORGANIZATION_DELETE} fallback={<span>Fallback</span>}>
        <span>Hidden</span>
      </RequirePermission>,
      { orgSlug: 'acme', memberships: [membership] }
    );
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('respects an additive permission override granted on top of the role default', () => {
    const grantedMembership = { ...membership, permissions: [PERMISSIONS.EVENT_UPDATE] };
    renderAtOrgRoute(
      <RequirePermission permission={PERMISSIONS.EVENT_UPDATE}>
        <span>Granted</span>
      </RequirePermission>,
      { orgSlug: 'acme', memberships: [grantedMembership] }
    );
    expect(screen.getByText('Granted')).toBeInTheDocument();
  });
});
