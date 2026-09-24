import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAtOrgRoute } from '../../tests/test-utils.jsx';
import { SidebarNav } from './SidebarNav.jsx';

function membership(role, permissions = []) {
  return { organizationId: 'org-1', organizationSlug: 'acme', organizationName: 'Acme', role, permissions };
}

function renderNav(role, props = {}) {
  return renderAtOrgRoute(<SidebarNav organizationSlug="acme" {...props} />, {
    orgSlug: 'acme',
    memberships: [membership(role)],
  });
}

const linkNames = () => screen.getAllByRole('link').map((a) => a.getAttribute('aria-label') ?? a.textContent);

describe('SidebarNav', () => {
  it('shows every item in both groups to a SUPER_ADMIN', async () => {
    renderNav('SUPER_ADMIN');
    expect(await screen.findByText('Workspace')).toBeInTheDocument();
    expect(screen.getByText('Management')).toBeInTheDocument();
    expect(linkNames()).toEqual(['Dashboard', 'Events', 'Calendar', 'Members', 'Analytics', 'Audit Log', 'Settings']);
  });

  it('gives an ORGANIZER Analytics but drops the whole Management group, heading included', async () => {
    renderNav('ORGANIZER');
    expect(await screen.findByText('Workspace')).toBeInTheDocument();
    expect(linkNames()).toEqual(['Dashboard', 'Events', 'Calendar', 'Members', 'Analytics']);
    expect(screen.queryByText('Management')).not.toBeInTheDocument();
  });

  it('shows an EMPLOYEE only the basics', async () => {
    renderNav('EMPLOYEE');
    expect(await screen.findByText('Workspace')).toBeInTheDocument();
    expect(linkNames()).toEqual(['Dashboard', 'Events', 'Calendar', 'Members']);
    expect(screen.queryByText('Management')).not.toBeInTheDocument();
  });

  it('points every link at the organization-scoped route', async () => {
    renderNav('SUPER_ADMIN');
    await screen.findByText('Workspace');
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/org/acme/dashboard');
    expect(hrefs).toContain('/org/acme/audit-logs');
    expect(hrefs.every((href) => href.startsWith('/org/acme/'))).toBe(true);
  });

  describe('collapsed icon rail', () => {
    it('drops visible labels and group headings but keeps an accessible name and tooltip on every link', async () => {
      renderNav('SUPER_ADMIN', { collapsed: true });
      await screen.findByRole('navigation');

      expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument(); // no visible text
      for (const link of screen.getAllByRole('link')) {
        expect(link).toHaveAttribute('aria-label');
        expect(link).toHaveAttribute('title', link.getAttribute('aria-label'));
      }
      expect(screen.getByRole('link', { name: 'Audit Log' })).toBeInTheDocument();
    });
  });
});
